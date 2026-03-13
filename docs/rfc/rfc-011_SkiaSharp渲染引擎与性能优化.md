# RFC-011: SkiaSharp 渲染引擎与性能优化

## 1. 背景
AudioFlow 的可视化渲染需要稳定 60 FPS、低延迟与高一致性。为避免 UI 卡顿与资源泄漏，必须建立可复用、可扩展的 SkiaSharp 渲染引擎，并支持 DPI 自适应与多可视化器场景。

## 2. 目标
- 提供统一 RenderEngine 抽象，集中管理 GPU/Skia 资源
- 支持双缓冲（Front/Back）避免撕裂
- 帧率稳定在 60 FPS，避免过度渲染
- 支持 DPI 感知与分辨率自适应
- 可扩展背景渐变、粒子与滤镜效果

## 3. 非目标
- 不直接负责音频 DSP 计算
- 不实现跨进程渲染或远程渲染

## 4. 设计方案

### 4.1 RenderEngine 架构
- RenderEngine 维护前后两张 SKSurface
- BeginFrame 获取 BackBuffer 的 SKCanvas
- EndFrame 交换 Front/Back 并生成可绘制的 SKImage
- 渲染尺寸按 DPI 进行像素级放大，保持清晰度

### 4.2 渲染管线
1. UI 线程触发 Render
2. 计算目标尺寸（Width/Height）与 RenderScaling
3. RenderEngine.BeginFrame(width, height, scale)
4. 调用 VisualizerHost 渲染可视化内容
5. RenderEngine.EndFrame() 获取 Image
6. 将 Image 绘制到 UI 画布

### 4.3 帧率控制
- UI 端使用 60 FPS 刷新循环
- RenderEngine 记录帧时间，便于性能追踪
- 当帧耗时超阈值时可降级渲染（例如减少粒子）

### 4.4 DPI 感知
- RenderScaling 来自 UI 框架
- 内部像素渲染尺寸 = 逻辑尺寸 × RenderScaling
- 输出时自动缩放回逻辑尺寸

### 4.5 资源管理
- SKSurface/ SKImage 必须在帧结束后及时释放
- RenderEngine 负责生命周期，UI 不直接持有 GPU 资源

## 5. 接口规范

### 5.1 RenderEngine
- BeginFrame(width, height, scale)
- EndFrame() -> RenderFrame (包含 Image 与 Scale)

### 5.2 RenderFrame
- Image: SKImage
- Scale: float

## 6. 性能指标
- 60 FPS 稳定刷新
- 8192 FFT 可视化渲染 < 10ms
- 不得产生持续性 GC 压力

## 7. 风险与缓解
- GPU 不可用：降级为 CPU 绘制
- 设备 DPI 不一致：通过 RenderScaling 统一处理
- 视觉抖动：通过双缓冲和帧率锁定缓解

## 8. 交付物
- RenderEngine 实现
- 帧率锁定与性能监控
- DPI 自适应绘制
- 可视化渲染示例
