import { describe, expect, it } from "vitest";

import { HeatmapTracker } from "./heatmap-tracker.js";
import { DEFAULT_HEATMAP_CONFIG } from "../constants/constants.js";

describe("HeatmapTracker", () => {
  it("uses defaults and supports configuration updates", () => {
    const tracker = new HeatmapTracker(DEFAULT_HEATMAP_CONFIG);

    tracker.configure({ mergeRadius: 2, maxHotspots: 5 });
    tracker.recordPosition(100, 100, { width: 800, height: 600 });
    tracker.recordPosition(102, 102, { width: 800, height: 600 });

    const snapshot = tracker.getSnapshot();

    // mergeRadius is clamped to >= 4, so these points should still merge.
    expect(snapshot.hotspots.length).toBe(1);
    expect(snapshot.hotspots[0].count).toBe(2);
  });

  it("keeps hotspot count within configured limit", () => {
    const tracker = new HeatmapTracker({ mergeRadius: 4, maxHotspots: 20 });

    for (let index = 0; index < 50; index += 1) {
      tracker.recordPosition(index * 10, 0, { width: 2000, height: 1000 });
    }

    const snapshot = tracker.getSnapshot();
    expect(snapshot.hotspots.length).toBeLessThanOrEqual(20);
  });

  it("resets tracked state", () => {
    const tracker = new HeatmapTracker();

    tracker.recordPosition(200, 140, { width: 1000, height: 700 });
    tracker.reset();

    const snapshot = tracker.getSnapshot();

    expect(snapshot.totalSamples).toBe(0);
    expect(snapshot.hotspots).toEqual([]);
    expect(snapshot.trackedSince).toBeNull();
  });

  it("stores positions as normalized coordinates and remaps them to the current viewport", () => {
    const tracker = new HeatmapTracker();

    tracker.recordPosition(25, 10, { width: 100, height: 50 });
    tracker.updateViewport({ width: 200, height: 100 });

    const snapshot = tracker.getSnapshot();

    expect(snapshot.viewport).toEqual({ width: 200, height: 100 });
    expect(snapshot.hotspots).toHaveLength(1);
    expect(snapshot.hotspots[0].x).toBeCloseTo(50);
    expect(snapshot.hotspots[0].y).toBeCloseTo(20);
  });

  it("ignores invalid viewports for both recording and updates", () => {
    const tracker = new HeatmapTracker();

    tracker.recordPosition(10, 10, { width: 0, height: 100 });
    tracker.recordPosition(10, 10, { width: 100, height: 50 });
    tracker.updateViewport({ width: 0, height: 80 });
    tracker.updateViewport({ width: 80, height: 0 });

    const snapshot = tracker.getSnapshot();

    expect(snapshot.totalSamples).toBe(1);
    expect(snapshot.viewport).toEqual({ width: 100, height: 50 });
    expect(snapshot.hotspots[0].x).toBeCloseTo(10);
    expect(snapshot.hotspots[0].y).toBeCloseTo(10);
  });

  it("records weighted samples as multiple counts at the same point", () => {
    const tracker = new HeatmapTracker();

    tracker.recordPosition(40, 20, { width: 200, height: 100 }, 3);

    const snapshot = tracker.getSnapshot();

    expect(snapshot.totalSamples).toBe(3);
    expect(snapshot.hotspots).toHaveLength(1);
    expect(snapshot.hotspots[0].count).toBe(3);
    expect(snapshot.hotspots[0].x).toBeCloseTo(40);
    expect(snapshot.hotspots[0].y).toBeCloseTo(20);
  });

  it("treats non-positive or non-finite weight as a single sample", () => {
    const tracker = new HeatmapTracker();

    tracker.recordPosition(10, 10, { width: 100, height: 100 }, 0);
    tracker.recordPosition(10, 10, { width: 100, height: 100 }, Number.NaN);
    tracker.recordPosition(80, 80, { width: 100, height: 100 }, Number.NEGATIVE_INFINITY);

    const snapshot = tracker.getSnapshot();

    expect(snapshot.totalSamples).toBe(3);
    expect(snapshot.hotspots[0].count).toBeGreaterThanOrEqual(1);
  });

  it("merges a weighted sample into the nearest hotspot", () => {
    const tracker = new HeatmapTracker({ mergeRadius: 24 });

    tracker.recordPosition(100, 100, { width: 400, height: 400 });
    tracker.recordPosition(104, 101, { width: 400, height: 400 }, 2);

    const snapshot = tracker.getSnapshot();

    expect(snapshot.hotspots).toHaveLength(1);
    expect(snapshot.hotspots[0].count).toBe(3);
    expect(snapshot.totalSamples).toBe(3);
  });
});
