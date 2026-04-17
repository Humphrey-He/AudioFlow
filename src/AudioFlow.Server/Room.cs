using System.Collections.Concurrent;
using System.Net.WebSockets;

namespace AudioFlow.Server;

class Room
{
    public string Code { get; set; } = "";
    public WebSocket? Host { get; set; }
    public ConcurrentDictionary<WebSocket, bool> Participants { get; } = new();
    public bool IsActive => Host != null && Host.State == WebSocketState.Open;
    public float[] Magnitudes { get; } = new float[512];
    public int FrameCount { get; set; } = 0;
    public string Timestamp { get; set; } = "";
}

class RoomManager
{
    private readonly ConcurrentDictionary<string, Room> _rooms = new();
    private const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private const int MaxParticipantsPerRoom = 10;

    public string GenerateCode()
    {
        var random = new Random();
        var code = new char[6];
        lock (random)
        {
            for (int i = 0; i < 6; i++)
            {
                code[i] = chars[random.Next(chars.Length)];
            }
        }
        var codeStr = new string(code);
        if (_rooms.ContainsKey(codeStr))
        {
            return GenerateCode();
        }
        return codeStr;
    }

    public Room? CreateRoom(WebSocket host)
    {
        var code = GenerateCode();
        var room = new Room { Code = code, Host = host };
        if (_rooms.TryAdd(code, room))
        {
            return room;
        }
        return null;
    }

    public Room? GetRoom(string code)
    {
        _rooms.TryGetValue(code, out var room);
        return room;
    }

    public bool JoinRoom(string code, WebSocket participant)
    {
        if (!_rooms.TryGetValue(code, out var room))
        {
            return false;
        }

        if (room.Participants.Count >= MaxParticipantsPerRoom)
        {
            return false;
        }

        room.Participants.TryAdd(participant, true);
        return true;
    }

    public void LeaveRoom(string code, WebSocket participant)
    {
        if (_rooms.TryGetValue(code, out var room))
        {
            room.Participants.TryRemove(participant, out _);
        }
    }

    public void CloseRoom(string code)
    {
        _rooms.TryRemove(code, out _);
    }

    public void UpdateRoomData(string code, float[] magnitudes, int frameCount, string timestamp)
    {
        if (!_rooms.TryGetValue(code, out var room))
        {
            return;
        }

        lock (room.Magnitudes)
        {
            Array.Copy(magnitudes, room.Magnitudes, magnitudes.Length);
            room.FrameCount = frameCount;
            room.Timestamp = timestamp;
        }
    }

    public async Task BroadcastToParticipants(string code, byte[] data)
    {
        if (!_rooms.TryGetValue(code, out var room))
        {
            return;
        }

        var toRemove = new List<WebSocket>();

        foreach (var participant in room.Participants.Keys)
        {
            try
            {
                if (participant.State == WebSocketState.Open)
                {
                    await participant.SendAsync(data, WebSocketMessageType.Text, true, CancellationToken.None);
                }
                else
                {
                    toRemove.Add(participant);
                }
            }
            catch
            {
                toRemove.Add(participant);
            }
        }

        foreach (var p in toRemove)
        {
            room.Participants.TryRemove(p, out _);
        }
    }

    public int GetParticipantCount(string code)
    {
        if (_rooms.TryGetValue(code, out var room))
        {
            return room.Participants.Count;
        }
        return 0;
    }
}