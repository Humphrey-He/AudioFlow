# AudioFlow 灵动动效设计

## 1. 动效设计理念

### 1.1 核心原则
- **响应性**: 动效必须跟随音频数据实时响应，不可延迟
- **流畅性**: 目标 60fps，GPU 加速优先
- **克制**: 动效服务于可视化，不可喧宾夺主
- **性能**: 移动端也要流畅运行

### 1.2 性能预算
- 每帧渲染时间: < 8ms (留 8ms 给其他任务)
- Canvas 操作: 最小化 `fillRect`/`stroke` 调用次数
- 对象分配: 避免每帧 new 对象，使用对象池

## 2. 动效类型详解

### 2.1 频谱条形动画

#### 基础条形
- 默认渐变色: 绿(#38d9a9) → 紫(#6c5ce7) → 红(#e74c3c)
- 高度映射: dB 值 (-60 ~ 0) → 0% ~ 100%

#### 顶部发光 (Top Glow)
```
触发条件: magnitude > -20dB
效果:
  - 在条形顶部添加 10px 高光
  - 发光强度 = (magnitude + 60) / 40
  - 颜色从白渐变到当前条形颜色
```

#### 条形圆角 (Rounded Bars)
```
实现: ctx.roundRect() 或手动绘制圆角矩形
圆角半径: 3px
性能影响: 极低
```

#### 条形倒影 (Reflection)
```
位置: 主条形下方 10px 间隔
高度: 主条形的 30%
透明度: 0.15
模糊: 使用 shadowBlur 模拟
```

### 2.2 背景脉动动画

#### 低频能量背景
```
检测: 低频段 (20Hz-200Hz) 平均能量
效果:
  - 背景色从 #0a0a0f 向 #1a1a2e 渐变
  - 脉动周期: 跟随低频节奏
  - 透明度变化: 0 ~ 0.3
```

#### 网格呼吸
```
效果: 背景网格线随能量呼吸
实现:
  - 网格线颜色从 #2a2a3a → #3a3a4a 循环
  - 周期: 2秒完成一次呼吸
```

### 2.3 峰值光晕动画

#### Peak Hold & Decay
```
行为:
  - 显示当前帧最高能量点
  - 保持 1.5 秒 (hold)
  - 然后 0.5 秒衰减到当前值 (decay)
视觉效果:
  - 白色小圆点标记峰值位置
  - 周围光晕向外扩散并淡出
```

#### 峰值轨迹线
```
行为: 峰值点随时间移动形成轨迹
实现:
  - 保留最近 60 帧的峰值位置
  - 用半透明线连接
  - 形成"山脊"效果
```

### 2.4 频率曲线动画

#### 中心线动画
```
行为: 在条形底部显示一条平滑曲线
效果:
  - 曲线连接所有条形中点
  - 线条粗细: 2px
  - 颜色: 渐变色 (同条形)
  - 带阴影发光
```

### 2.5 环形/极坐标动画

#### 半圆频谱
```
布局:
  - 条形从中心向两侧展开
  - 形成半圆形频谱
  - 低频在中心，高频在两侧
效果:
  - 更符合人耳对频率的感知
  - 视觉效果更具科技感
```

#### 能量环
```
行为: 圆形环随低频能量扩张
实现:
  - 环半径 = 基础半径 + 低频能量 * 系数
  - 环宽度: 3px
  - 颜色: 半透明渐变
```

### 2.6 粒子系统

#### 频率峰值粒子
```
触发: magnitude 突然增加超过阈值
行为:
  - 从峰值点发射 5-10 个粒子
  - 粒子向上/两侧飞散
  - 生命周期: 0.5 秒
  - 大小: 2-4px
颜色: 与当前条形颜色一致
```

#### 背景粒子
```
行为: 背景漂浮微小粒子
数量: 20-30 个
速度: 极慢 (0.1-0.3 px/frame)
透明度: 0.1-0.3
```

## 3. 实现优先级

| 优先级 | 动效 | 原因 |
|--------|------|------|
| P0 | 条形顶部发光 | 视觉提升明显，性能优 |
| P0 | Peak Hold & Decay | 增强数据可读性 |
| P1 | 条形倒影 | 简单，提升层次感 |
| P1 | 背景脉动 | 增强沉浸感 |
| P2 | 中心线动画 | 视觉效果佳 |
| P2 | 频率峰值粒子 | 性能消耗较大 |
| P3 | 半圆频谱 | 实现复杂，效果酷炫 |
| P3 | 能量环 | 需要 radial gradient，优化复杂 |

## 4. 性能优化策略

### 4.1 渲染优化
```javascript
// 坏: 每帧创建新对象
ctx.createLinearGradient() // 每帧调用

// 好: 预创建，复用
const gradient = ctx.createLinearGradient(...)
// 只在 canvas 尺寸变化时重建
```

### 4.2 批量绘制
```javascript
// 坏: 多次 fillRect
for (i = 0; i < 512; i++) {
  ctx.fillRect(x, y, w, h);
}

// 好: 合并路径 (Path2D)
const path = new Path2D();
for (i = 0; i < 512; i++) {
  path.rect(x, y, w, h);
}
ctx.fill(path);
```

### 4.3 节流/防抖
```javascript
// 非关键动效可降低更新频率
let frameCount = 0;
function render() {
  frameCount++;
  // 背景脉动每 2 帧更新一次
  if (frameCount % 2 === 0) {
    updateBackgroundPulse();
  }
  // 条形每帧更新
  drawBars();
}
```

## 5. 动效配置接口

```typescript
interface AnimationConfig {
  // 条形效果
  barRounded: boolean;
  barGlow: boolean;
  barGlowThreshold: number; // dB, default -20
  barReflection: boolean;

  // 背景效果
  backgroundPulse: boolean;
  backgroundPulseIntensity: number; // 0-1
  gridBreath: boolean;

  // 峰值效果
  peakHold: boolean;
  peakHoldDuration: number; // ms
  peakGlow: boolean;
  peakTrail: boolean;
  peakTrailLength: number; // frames

  // 曲线效果
  centerLine: boolean;

  // 高级效果 (P2/P3)
  particles: boolean;
  radialSpectrum: boolean;
  energyRing: boolean;
}
```

## 6. UI 控制接口

在设置面板中添加动效控制:

```
┌─ Animation Effects ──────────────────┐
│ □ Bar Glow          [threshold: -20dB]│
│ □ Bar Reflection                        │
│ □ Background Pulse   [intensity: ████] │
│ □ Peak Hold                              │
│ □ Peak Glow                               │
│ □ Peak Trail         [length: 60]        │
│ □ Center Line                           │
│                                           │
│ Preset: [Default ▼] [Bassic] [炫彩] [简约] │
└─────────────────────────────────────────┘
```

## 7. 预设方案

| 预设 | 特点 | 适用场景 |
|------|------|---------|
| Default | 均衡所有效果 | 日常使用 |
| Bassic | 低频强化，粒子效果 | 电子音乐 |
| 炫彩 | 强发光，多彩渐变 | 展示/截图 |
| 简约 | 最小动效，省电 | 笔记本/移动端 |
| 性能模式 | 仅核心条形 | 低性能设备 |
