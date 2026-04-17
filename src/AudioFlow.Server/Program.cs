using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using AudioFlow.Audio.Buffering;
using AudioFlow.Server;
using AudioFlow.Audio.Providers;
using AudioFlow.Dsp.Analysis;
using AudioFlow.Dsp.Processing;
using AudioFlow.Dsp.Smoothing;
using AudioFlow.Dsp.Weighting;
using AudioFlow.Dsp.Windowing;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
var roomManager = new RoomManager();

app.UseWebSockets();
app.UseStaticFiles();

app.MapGet("/", () => Results.Redirect("/index.html"));

// WebSocket endpoint with room support
app.MapGet("/ws", async (HttpContext context) =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = 400;
        return;
    }

    using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
    var query = context.Request.Query;
    var mode = query["mode"].ToString();
    var roomCode = query["room"].ToString();

    if (mode == "participant" && !string.IsNullOrEmpty(roomCode))
    {
        // Participant mode - join existing room
        var room = roomManager.GetRoom(roomCode);
        if (room == null)
        {
            var errorMsg = JsonSerializer.Serialize(new { type = "error", code = "ROOM_NOT_FOUND", message = "Room not found" });
            var errorBytes = Encoding.UTF8.GetBytes(errorMsg);
            await webSocket.SendAsync(errorBytes, WebSocketMessageType.Text, true, CancellationToken.None);
            await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Room not found", CancellationToken.None);
            return;
        }

        if (!roomManager.JoinRoom(roomCode, webSocket))
        {
            var errorMsg = JsonSerializer.Serialize(new { type = "error", code = "ROOM_FULL", message = "Room is full" });
            var errorBytes = Encoding.UTF8.GetBytes(errorMsg);
            await webSocket.SendAsync(errorBytes, WebSocketMessageType.Text, true, CancellationToken.None);
            await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Room full", CancellationToken.None);
            return;
        }

        // Send room info
        var joinAck = JsonSerializer.Serialize(new
        {
            type = "room_joined",
            code = roomCode,
            participantCount = roomManager.GetParticipantCount(roomCode)
        });
        var joinBytes = Encoding.UTF8.GetBytes(joinAck);
        await webSocket.SendAsync(joinBytes, WebSocketMessageType.Text, true, CancellationToken.None);

        // Relay loop for participant
        var buf = new byte[4096];
        while (webSocket.State == WebSocketState.Open)
        {
            var result = await webSocket.ReceiveAsync(buf, CancellationToken.None);
            if (result.MessageType == WebSocketMessageType.Close)
            {
                break;
            }
        }

        roomManager.LeaveRoom(roomCode, webSocket);
        return;
    }

    // Host mode - create room and capture audio
    var newRoom = roomManager.CreateRoom(webSocket);
    if (newRoom == null)
    {
        await webSocket.CloseAsync(WebSocketCloseStatus.InternalServerError, "Failed to create room", CancellationToken.None);
        return;
    }

    var roomCodeStr = newRoom.Code;

    // Send room info to host
    var ack = JsonSerializer.Serialize(new
    {
        type = "room_created",
        code = roomCodeStr,
        maxParticipants = 10
    });
    var ackBytes = Encoding.UTF8.GetBytes(ack);
    await webSocket.SendAsync(ackBytes, WebSocketMessageType.Text, true, CancellationToken.None);

    // Initialize audio pipeline
    var factory = new AudioProviderFactory();
    var provider = factory.CreateSystemCaptureProvider();
    using var pipeline = new AudioBufferPipeline(provider, bufferCapacity: 4096);

    var analyzer = new SpectrumAnalyzer(new SpectrumAnalyzerOptions
    {
        FftSize = 1024,
        ZeroPaddingFactor = 1,
        WindowFunction = WindowFunctionType.Hann,
        IncludePhase = false
    });

    var processor = new SpectrumProcessor(
        analyzer,
        FrequencyWeightingType.A,
        new SmoothingSettings { Type = SmoothingType.Gravity, Attack = 0.6f, Decay = 0.2f },
        logScale: true);

    var buffer = new float[1024];
    var magnitudes = new float[512];
    var frameCount = 0;

    pipeline.Start();

    var sendTask = Task.Run(async () =>
    {
        while (webSocket.State == WebSocketState.Open)
        {
            var read = pipeline.Read(buffer);
            if (read < 1024)
            {
                await Task.Delay(5);
                continue;
            }

            var result = processor.Process(buffer, 48000);

            // Downsample to ~60 bins for visualization
            Array.Copy(result.Magnitudes, magnitudes, 512);

            // Update room data for broadcast
            roomManager.UpdateRoomData(roomCodeStr, magnitudes, frameCount, DateTime.UtcNow.ToString("O"));

            var data = new
            {
                type = "spectrum_frame",
                frame = frameCount,
                timestamp = DateTime.UtcNow.ToString("O"),
                magnitudes = magnitudes.Select(m => Math.Round(m, 1)).ToArray()
            };

            var json = JsonSerializer.Serialize(data);
            var bytes = Encoding.UTF8.GetBytes(json);

            // Send to host
            if (webSocket.State == WebSocketState.Open)
            {
                await webSocket.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
            }

            // Broadcast to participants
            await roomManager.BroadcastToParticipants(roomCodeStr, bytes);

            frameCount++;
            await Task.Delay(50); // ~20 fps
        }
    });

    try
    {
        await sendTask;
    }
    catch (WebSocketException)
    {
        // Client disconnected
    }
    finally
    {
        pipeline.Stop();
        roomManager.CloseRoom(roomCodeStr);
    }
});

app.Run();