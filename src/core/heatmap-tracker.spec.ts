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
});
