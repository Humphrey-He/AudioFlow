# AudioFlow 前端技术规划

## 1. 现状分析

### 1.1 当前实现
- **技术**: 纯 HTML + 内联 JavaScript，单文件约 400 行
- **渲染**: HTML5 Canvas 2D，requestAnimationFrame 循环
- **数据流**: WebSocket 直连 → DOM 更新，无中间层
- **i18n**: 硬编码 JS 对象，三个语言翻译内联
- **构建**: 无构建工具，直接 served as static file

### 1.2 存在的问题

| 问题 | 影响 |
|------|------|
| 强耦合 | UI 逻辑、数据处理、WebSocket 全混在一起 | 无法单元测试 |
| 无类型检查 | JS 运行时错误难定位 | 重构风险高 |
| 不可复用 | 组件无法在其他页面复用 | 代码膨胀 |
| 无构建流程 | 无法使用 npm 生态 | 开发效率低 |
| 状态管理缺失 | 多组件状态同步困难 | 维护成本高 |

### 1.3 真实项目数据流分析

```
WebSocket (~20fps)
    │
    ▼
┌─────────────────────────────────────────────────┐
│  音频数据处理 (buffer 处理、FFT 结果)              │
│  - 实时性要求: < 50ms 延迟                       │
│  - 内存: 固定 size ring buffer                   │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  状态层 (React/Zustand)                         │
│  - magnitudes: Float32Array                     │
│  - connectionStatus: 'connected' | 'disconnected'│
│  - settings: { smoothing, attack, decay, weighting } │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  可视化层 (Canvas / WebGL)                       │
│  - 60fps 渲染循环                               │
│  - 独立于数据层                                 │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  UI 控制层                                      │
│  - 参数调整 → WebSocket 发送配置                 │
│  - 语言切换 → i18n 上下文                       │
└─────────────────────────────────────────────────┘
```

## 2. 技术选型

### 2.1 框架选择

| 框架 | 实时性能 | 生态 | 学习曲线 | 推荐度 |
|------|---------|------|---------|--------|
| React 18 | ★★★★☆ | ★★★★★ | 中等 | **首选** |
| Vue 3 | ★★★★☆ | ★★★★☆ | 平缓 | 次选 |
| Svelte | ★★★★★ | ★★★☆☆ | 平缓 | 备选 |
| Solid | ★★★★★ | ★★☆☆☆ | 较陡 | 备选 |

**推荐理由**:
- React 18 `useSyncExternalStore` 支持高频更新优化
- `useTransition` / `useDeferredValue` 可处理防抖
- 社区最成熟，问题解决方案多
- 生态工具链完整 (Vite, TypeScript, testing-library)

### 2.2 状态管理

| 方案 | 包大小 | 适用场景 | 推荐度 |
|------|--------|---------|--------|
| Zustand | ~1KB | 中小应用，高频更新 | **首选** |
| Jotai | ~2KB | 原子化状态 | 次选 |
| Redux Toolkit | ~10KB | 大型应用 | 过度 |
| MobX | ~20KB | 复杂响应式 | 过度 |

**推荐理由**:
- Zustand 的 `subscribeWithSelector` 可精确订阅需要的 slice
- 避免 React re-render 风暴
- 内置 immer 支持，mutable 写法
- 可脱离 React 使用

### 2.3 渲染方案

| 方案 | 60fps 能力 | 实现难度 | 推荐场景 |
|------|-----------|---------|---------|
| Canvas 2D | ★★★★☆ | 简单 | 当前需求，已足够 |
| WebGL | ★★★★★ | 复杂 | 未来 3D 频谱 |
| SVG | ★★☆☆☆ | 中等 | 不推荐 |

**当前推荐**: Canvas 2D
- 频谱可视化用条形图，Canvas 2D 完全满足
- requestAnimationFrame + 双缓冲可实现 60fps
- 比 WebGL 实现简单 10x，维护成本低

### 2.4 构建工具

| 工具 | 速度 | 生态 | 推荐度 |
|------|------|------|--------|
| Vite | 极快 | ★★★★★ | **首选** |
| esbuild | 最快 | ★★★☆☆ | 备选 |
| webpack | 慢 | ★★★★★ | 不推荐新项目 |

### 2.5 i18n 方案

| 方案 | 灵活性 | Tree-shaking | 推荐度 |
|------|--------|-------------|--------|
| react-i18next | 高 | 是 | **首选** |
| i18next | 高 | 是 | 次选 |
| 硬编码对象 | 低 | 否 | 过渡期可接受 |

## 3. 目标架构

### 3.1 目录结构

```
src/
├── assets/                    # 静态资源
│   └── fonts/
├── components/                # UI 组件
│   ├── Canvas/
│   │   ├── SpectrumCanvas.tsx
│   │   ├── SpectrumCanvas.module.css
│   │   └── useSpectrumRenderer.ts  # Canvas 渲染 hook
│   ├── Controls/
│   │   ├── SmoothingSelect.tsx
│   │   ├── AttackRange.tsx
│   │   ├── DecayRange.tsx
│   │   ├── WeightingSelect.tsx
│   │   └── Controls.module.css
│   ├── Stats/
│   │   ├── StatCard.tsx
│   │   ├── StatsPanel.tsx
│   │   └── Stats.module.css
│   └── Layout/
│       ├── Header.tsx
│       ├── LanguageSelect.tsx
│       └── Layout.module.css
├── hooks/                     # 自定义 hooks
│   ├── useWebSocket.ts        # WebSocket 连接管理
│   ├── useSpectrumData.ts     # 频谱数据订阅
│   ├── useAudioSettings.ts    # 设置状态
│   └── useLanguage.ts        # i18n hook
├── stores/                    # Zustand stores
│   ├── audioStore.ts          # 音频数据状态
│   ├── settingsStore.ts       # 用户设置
│   └── connectionStore.ts     # 连接状态
├── services/                  # 业务逻辑
│   ├── websocket.ts           # WebSocket 服务
│   └── audioProcessor.ts      # 音频数据处理
├── i18n/                      # 国际化
│   ├── index.ts
│   └── locales/
│       ├── en.json
│       ├── zh.json
│       └── ja.json
├── types/                     # TypeScript 类型
│   ├── audio.ts
│   ├── settings.ts
│   └── websocket.ts
├── utils/                     # 工具函数
│   ├── db.ts                  # dB 计算
│   └── logScale.ts            # 对数刻度映射
├── App.tsx
├── main.tsx
└── index.html
```

### 3.2 核心数据流设计

```
WebSocket Message
    │
    ▼
services/websocket.ts
    │ 解析 JSON
    ▼
stores/audioStore.ts
    │ 存储 magnitudes, frameCount, timestamp
    │ (Zustand, 避免不必要渲染)
    ▼
hooks/useSpectrumData.ts
    │ 订阅 audioStore.magnitudes
    │ 返回用于渲染的数据
    ▼
components/Canvas/useSpectrumRenderer.ts
    │ requestAnimationFrame 循环
    │ 从 useSpectrumData 读取数据
    ▼
Canvas 2D 渲染
```

### 3.3 状态分割 (防止不必要的重渲染)

```typescript
// stores/audioStore.ts
interface AudioState {
  magnitudes: Float32Array;
  frameCount: number;
  peakDb: number;
  avgDb: number;
}

export const useAudioStore = create<AudioState>((set) => ({
  magnitudes: new Float32Array(512),
  frameCount: 0,
  peakDb: -180,
  avgDb: -180,
}));

// 组件只订阅需要的数据
const magnitudes = useAudioStore((s) => s.magnitudes);  // 精确订阅
const frameCount = useAudioStore((s) => s.frameCount);
```

## 4. 分阶段实施计划

### Phase 1: 基础设施 (1-2 天)

**目标**: 建立可运行的 TypeScript + React + Vite 项目

| 任务 | 详情 | 产出 |
|------|------|------|
| 初始化项目 | `npm create vite@latest -- --template react-ts` | 基础项目结构 |
| 配置 TypeScript | strict mode, path alias | tsconfig.json |
| 配置 ESLint/Prettier | Airbnb rules | .eslintrc, .prettierrc |
| 配置 i18n | react-i18next, 三语言 | i18n/ 目录 |
| 迁移现有 HTML | 拆分为 React 组件 | 基础 UI |

**里程碑**: `npm run dev` 可运行，展示基础 UI

### Phase 2: 核心功能 (2-3 天)

**目标**: 实现 WebSocket 数据流和 Canvas 渲染

| 任务 | 详情 | 产出 |
|------|------|------|
| WebSocket 服务 | 连接/重连/心跳 | useWebSocket hook |
| 数据处理 | 解析消息，更新 store | audioStore |
| Canvas 渲染 | requestAnimationFrame | useSpectrumRenderer |
| 基础控件 | Select, Range 组件 | Controls/ |
| 统计面板 | Frame/Peak/Avg/FPS | StatsPanel |

**里程碑**: 实时频谱显示，数据流贯通

### Phase 3: 完善 UI (1-2 天)

**目标**: 完善交互体验和响应式

| 任务 | 详情 | 产出 |
|------|------|------|
| 样式重构 | CSS Modules | *.module.css |
| 悬浮提示 | tooltip 组件 | Tooltip.tsx |
| 错误处理 | 连接失败提示 | ErrorMessage |
| 响应式 | 移动端适配 | media queries |
| 加载状态 | skeleton 或 spinner | LoadingState |

**里程碑**: UI/UX 达到生产可用

### Phase 4: 测试与优化 (1-2 天)

**目标**: 保证质量和性能

| 任务 | 详情 | 产出 |
|------|------|------|
| 单元测试 | Vitest + Testing Library | *.test.tsx |
| Canvas 性能 | FPS 监控，优化渲染 | 60fps 稳定 |
| 内存泄漏 | WebSocket cleanup | 无内存泄漏 |
| Lighthouse | 性能评分 | 报告 |

**里程碑**: 通过 CI 测试，性能达标

## 5. 技术栈总结

| 类别 | 选择 | 版本 |
|------|------|------|
| 框架 | React | 18.x |
| 语言 | TypeScript | 5.x (strict) |
| 构建 | Vite | 5.x |
| 状态 | Zustand | 4.x |
| i18n | react-i18next | 14.x |
| 样式 | CSS Modules | - |
| 测试 | Vitest + RTL | latest |
| 预提交 | lint-staged + husky | latest |

## 6. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Canvas 60fps 抖动 | 用户体验差 | 使用双缓冲，RAF 节流 |
| WebSocket 内存泄漏 | 长时间运行崩溃 | 严格 cleanup，onunload 处理 |
| 状态更新触发重渲染 | UI 卡顿 | Zustand 精确订阅，避免派生状态 |
| i18n 切换延迟 | 体验不流畅 | 使用 useTransition 包装 |

## 7. 扩展预留

以下功能可在后续迭代中实现:

1. **多可视化模式**: 瀑布图、波形图、3D 频谱
2. **音频文件播放**: FileReader → AudioContext → 可视化
3. **预设管理**: 保存/加载参数配置
4. **主题切换**: Dark/Light 模式
5. **快捷键**: 全局快捷键控制
6. **PWA 支持**: 离线缓存，桌面通知

## 8. 迁移策略

**保持向后兼容**: 当前 `wwwroot/index.html` 保留为 `legacy.html`，新架构完成后可切换或并行运行。

**渐进式迁移**:
```
Phase 1: 新项目结构 + 现有 UI 迁移
Phase 2: 数据流重构
Phase 3: 组件化
Phase 4: 测试覆盖
```
