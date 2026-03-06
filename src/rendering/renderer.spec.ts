import { describe, expect, it } from "vitest";

import {
  calculateFieldStrength,
  getDominantHeatColor,
  getRelativeStrength,
  interpolateHeatColor
} from "./renderer.js";

describe("heatmap renderer utilities", () => {
  it("maps count to relative strength", () => {
    expect(getRelativeStrength(10, 10)).toBe(1);
    expect(getRelativeStrength(0, 10)).toBe(0);
    expect(getRelativeStrength(10, 0)).toBe(0);
  });

  it("interpolates colors across the heat scale", () => {
    const low = interpolateHeatColor(0);
    const high = interpolateHeatColor(1);

    expect(low).toEqual([20, 34, 120]);
    expect(high).toEqual([255, 255, 255]);
  });

  it("calculates higher strength near a hotspot", () => {
    const hotspots = [{ x: 200, y: 200, count: 8 }];

    const near = calculateFieldStrength(210, 210, hotspots, 40, 8);
    const far = calculateFieldStrength(600, 600, hotspots, 40, 8);

    expect(near).toBeGreaterThan(far);
    expect(near).toBeGreaterThan(0);
  });

  it("returns visible low-heat colors instead of transparent output", () => {
    const [r, g, b, alpha] = getDominantHeatColor(0.02);

    expect([r, g, b]).toEqual([20, 34, 120]);
    expect(alpha).toBeGreaterThan(0);
  });
});
