import { describe, expect, it, vi } from "vitest";

import {
  configureMouseHeatmap,
  getMouseHeatmapData,
  hello,
  recordMousePosition,
  resetMouseHeatmap,
  startMouseTracking,
  stopMouseTracking
} from "./index.js";

describe("mouse heatmap", () => {
  it("aggregates pointer samples into hotspots", () => {
    resetMouseHeatmap();

    recordMousePosition(100, 120, { width: 1000, height: 800 });
    recordMousePosition(120, 130, { width: 1000, height: 800 });
    recordMousePosition(900, 700, { width: 1000, height: 800 });

    const heatmap = getMouseHeatmapData();

    expect(heatmap.totalSamples).toBe(3);
    expect(heatmap.hotspots.length).toBe(2);
    expect(heatmap.hotspots[0].count).toBe(2);
    expect(heatmap.hotspots[0].intensity).toBe(1);
  });

  it("clears all tracked data", () => {
    resetMouseHeatmap();
    recordMousePosition(500, 300, { width: 1200, height: 900 });

    resetMouseHeatmap();

    const heatmap = getMouseHeatmapData();

    expect(heatmap.totalSamples).toBe(0);
    expect(heatmap.hotspots).toEqual([]);
    expect(heatmap.trackedSince).toBeNull();
  });

  it("tracks browser pointer events through start/stop", () => {
    resetMouseHeatmap();

    let capturedListener: (event: PointerEvent) => void = () => undefined;
    let pointerListenerRegistered = false;
    const fakeWindow = {
      innerWidth: 900,
      innerHeight: 700,
      addEventListener: vi.fn((eventName: string, listener: (event: PointerEvent) => void) => {
        if (eventName === "pointermove") {
          capturedListener = listener;
          pointerListenerRegistered = true;
        }
      }),
      removeEventListener: vi.fn()
    };

    const previousWindow = (globalThis as { window?: unknown }).window;
    Object.assign(globalThis as { window?: unknown }, { window: fakeWindow });

    try {
      startMouseTracking();
      expect(fakeWindow.addEventListener).toHaveBeenCalledTimes(1);
      expect(pointerListenerRegistered).toBe(true);
      capturedListener({ clientX: 320, clientY: 200 } as PointerEvent);

      const heatmap = getMouseHeatmapData();
      expect(heatmap.totalSamples).toBe(1);

      stopMouseTracking();
      expect(fakeWindow.removeEventListener).toHaveBeenCalledTimes(1);
    } finally {
      if (previousWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        Object.assign(globalThis as { window?: unknown }, { window: previousWindow });
      }
    }
  });

  it("applies tracker configuration through wrapper", () => {
    resetMouseHeatmap();
    configureMouseHeatmap({ mergeRadius: 120, maxHotspots: 100 });

    recordMousePosition(100, 100, { width: 800, height: 600 });
    recordMousePosition(180, 150, { width: 800, height: 600 });

    const heatmap = getMouseHeatmapData();
    expect(heatmap.hotspots.length).toBe(1);
  });

  it("uses safe viewport defaults when window is unavailable", () => {
    const previousWindow = (globalThis as { window?: unknown }).window;
    delete (globalThis as { window?: unknown }).window;

    try {
      resetMouseHeatmap();
      recordMousePosition(10, 15);
      const heatmap = getMouseHeatmapData();

      expect(heatmap.totalSamples).toBe(0);
    } finally {
      if (previousWindow !== undefined) {
        Object.assign(globalThis as { window?: unknown }, { window: previousWindow });
      }
    }
  });

  it("handles start and stop calls idempotently", () => {
    let capturedListener: ((event: PointerEvent) => void) | null = null;
    const fakeWindow = {
      innerWidth: 640,
      innerHeight: 480,
      addEventListener: vi.fn((eventName: string, listener: (event: PointerEvent) => void) => {
        if (eventName === "pointermove") {
          capturedListener = listener;
        }
      }),
      removeEventListener: vi.fn()
    };

    const previousWindow = (globalThis as { window?: unknown }).window;
    Object.assign(globalThis as { window?: unknown }, { window: fakeWindow });

    try {
      resetMouseHeatmap();

      startMouseTracking();
      startMouseTracking();
      expect(fakeWindow.addEventListener).toHaveBeenCalledTimes(1);

      capturedListener?.({ clientX: 100, clientY: 120 } as PointerEvent);
      expect(getMouseHeatmapData().totalSamples).toBe(1);

      stopMouseTracking();
      stopMouseTracking();
      expect(fakeWindow.removeEventListener).toHaveBeenCalledTimes(1);
    } finally {
      if (previousWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        Object.assign(globalThis as { window?: unknown }, { window: previousWindow });
      }
    }
  });

  it("no-ops tracking lifecycle when window is unavailable", () => {
    const previousWindow = (globalThis as { window?: unknown }).window;
    delete (globalThis as { window?: unknown }).window;

    try {
      startMouseTracking();
      stopMouseTracking();
      expect(getMouseHeatmapData()).toBeDefined();
    } finally {
      if (previousWindow !== undefined) {
        Object.assign(globalThis as { window?: unknown }, { window: previousWindow });
      }
    }
  });
});

describe("hello export", () => {
  it("returns the expected greeting", () => {
    expect(hello).toBe("hello");
  });
});
