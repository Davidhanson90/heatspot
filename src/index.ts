import {
  HeatmapTracker
} from "./core/heatmap-tracker.js";
import { DEFAULT_HEATMAP_CONFIG } from "./constants/constants.js";
import { HeatSpotElement } from "./heatspot-element.js";
import { type HeatmapConfig, type HeatmapSnapshot, type ViewportSize } from "./contracts/heatmap-contracts.js";

export const hello = "hello";

export { HeatSpotElement };
export { DEFAULT_HEATMAP_CONFIG, HeatmapTracker };
export type {
  HeatmapConfig,
  HeatmapHotspot,
  HeatmapToolbarMode,
  HeatmapSnapshot,
  ViewportSize
} from "./contracts/heatmap-contracts.js";

const globalTracker = new HeatmapTracker(DEFAULT_HEATMAP_CONFIG);
let moveListener: ((event: PointerEvent) => void) | null = null;

function getViewportFromWindow(): ViewportSize {
  if (typeof window === "undefined") {
    return { width: 0, height: 0 };
  }

  return {
    width: Math.max(0, window.innerWidth),
    height: Math.max(0, window.innerHeight)
  };
}

/**
 * Updates tracker settings for globally tracked mouse heatmap data.
 */
export function configureMouseHeatmap(nextConfig: Partial<HeatmapConfig>): void {
  globalTracker.configure(nextConfig);
}

/**
 * Records a single mouse position sample into the global tracker.
 */
export function recordMousePosition(
  x: number,
  y: number,
  viewport = getViewportFromWindow()
): void {
  globalTracker.recordPosition(x, y, viewport);
}

/**
 * Starts browser pointer tracking for the global tracker.
 */
export function startMouseTracking(): void {
  if (moveListener || typeof window === "undefined") {
    return;
  }

  moveListener = (event: PointerEvent) => {
    recordMousePosition(event.clientX, event.clientY, {
      width: window.innerWidth,
      height: window.innerHeight
    });
  };

  window.addEventListener("pointermove", moveListener, { passive: true });
}

/**
 * Stops browser pointer tracking for the global tracker.
 */
export function stopMouseTracking(): void {
  if (!moveListener || typeof window === "undefined") {
    return;
  }

  window.removeEventListener("pointermove", moveListener);
  moveListener = null;
}

/**
 * Clears all currently tracked global heatmap data.
 */
export function resetMouseHeatmap(): void {
  globalTracker.reset();
}

/**
 * Returns the latest global heatmap snapshot.
 */
export function getMouseHeatmapData(): HeatmapSnapshot {
  return globalTracker.getSnapshot();
}
