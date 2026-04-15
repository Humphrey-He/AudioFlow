# AudioFlow

Real-time audio spectrum analyzer and visualizer.

```
     ██████╗ ██╗     ██╗████████╗ ██████╗██╗  ██╗
    ██╔════╝ ██║     ██║╚══██╔══╝██╔════╝██║  ██║
    ██║  ███╗██║     ██║   ██║   ██║     ███████║
    ██║   ██║██║     ██║   ██║   ██║     ██╔══██║
    ╚██████╔╝███████╗██║   ██║   ╚██████╗██║  ██║
     ╚═════╝ ╚══════╝╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝
```

## Features

- **Real-time FFT Analysis** - 1024-point FFT with Cooley-Tukey algorithm
- **Multiple Smoothing Algorithms** - Gravity (attack/decay), LERP, or none
- **Frequency Weighting** - A-weighting, C-weighting, or linear
- **Visual Effects** - Glow, reflection, peak hold, background pulse, center line
- **Multi-language** - English, Chinese, Japanese
- **Responsive Design** - Works on desktop and mobile

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        AudioFlow                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │   Audio     │───▶│    DSP      │───▶│  Visualization  │  │
│  │  Capture   │    │  Processing │    │     (Canvas)    │  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
│         │                  │                      │          │
│         ▼                  ▼                      ▼          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │  NAudio /   │    │   FFT /     │    │   Spectrum /    │  │
│  │  ManagedBass│    │  Weighting  │    │   Waveform      │  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Projects

| Project | Description | Technology |
|---------|-------------|------------|
| `AudioFlow.Server` | WebSocket server for real-time streaming | ASP.NET Core |
| `AudioFlow.Client` | Web frontend with React | React + TypeScript |
| `AudioFlow.UI` | Avalonia cross-platform UI | Avalonia 11.x |
| `AudioFlow.Demo` | Console demo with ASCII visualization | .NET 9 |
| `AudioFlow.Dsp` | DSP processing library | .NET 9 |
| `AudioFlow.Audio` | Audio capture and buffering | NAudio / ManagedBass |

## Quick Start

### 1. Start the Server

```bash
cd src/AudioFlow.Server
dotnet run
```

The server starts on `http://localhost:5000`

### 2. Open in Browser

Navigate to `http://localhost:5000`

### 3. Grant Audio Permission

Allow microphone or system audio access when prompted.

## Development

### Frontend (React + TypeScript)

```bash
cd src/AudioFlow.Client
npm install
npm run dev
```

### Backend (ASP.NET Core)

```bash
cd src/AudioFlow.Server
dotnet run
```

### Run Tests

```bash
dotnet test
```

## Documentation

- [用户手册](docs/AudioFlow用户手册.md) - Chinese user manual
- [前端规划](docs/audioflow前端规划.md) - Frontend architecture plan
- [动效设计](docs/audioflow动效设计.md) - Animation design spec
- [RFC Documents](docs/rfc/) - Detailed technical specifications

## Tech Stack

### Backend
- .NET 9
- NAudio / ManagedBass (audio capture)
- Custom FFT implementation
- ASP.NET Core WebSocket

### Frontend
- React 18
- TypeScript (strict mode)
- Vite
- Zustand (state management)
- react-i18next
- Canvas 2D

### DSP Processing
- Cooley-Tukey FFT
- A/C-weighting filters
- Gravity/LERP smoothing
- Log-frequency mapping

## Performance

| Metric | Target | Actual |
|--------|--------|--------|
| FFT (8192-point) | < 10ms | ~1.7ms |
| Render FPS | 60 fps | 60 fps |
| Memory | < 200MB | ~80MB |
| Latency | < 50ms | ~30ms |

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit using conventional commits
4. Submit a pull request
