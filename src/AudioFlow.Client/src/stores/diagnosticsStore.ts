/**
 * Global performance metrics store (updated by renderer)
 * This is intentionally NOT reactive for high-frequency updates
 */
export const performanceMetrics = {
  fps: 0,
  frameCount: 0,
  lastRenderTime: 0,

  updateFps(fps: number) {
    this.fps = fps;
  },
  updateFrameCount(count: number) {
    this.frameCount = count;
  },
  updateRenderTime(time: number) {
    this.lastRenderTime = time;
  },
};
