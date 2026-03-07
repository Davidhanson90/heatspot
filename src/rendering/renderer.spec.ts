import { afterEach, describe, expect, it, vi } from "vitest";

import {
  calculateFieldStrength,
  getDominantHeatColor,
  getRelativeStrength,
  interpolateHeatColor,
  renderHeatmapOverlay
} from "./renderer.js";

describe("heatmap renderer utilities", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

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

  it("returns transparent output for zero strength and max output for high strength", () => {
    expect(getDominantHeatColor(0)).toEqual([0, 0, 0, 0]);

    const [r, g, b, alpha] = getDominantHeatColor(2);
    expect([r, g, b]).toEqual([255, 255, 255]);
    expect(alpha).toBeCloseTo(0.68, 5);
  });

  it("clamps heat interpolation input to valid scale bounds", () => {
    expect(interpolateHeatColor(-1)).toEqual([20, 34, 120]);
    expect(interpolateHeatColor(5)).toEqual([255, 255, 255]);
  });

  it("caps accumulated field strength at one", () => {
    const hotspots = [
      { x: 100, y: 100, count: 20 },
      { x: 100, y: 100, count: 20 },
      { x: 100, y: 100, count: 20 }
    ];

    expect(calculateFieldStrength(100, 100, hotspots, 40, 20)).toBe(1);
  });

  it("clears canvas and exits early when there are no hotspots", () => {
    const clearRect = vi.fn();
    const createImageData = vi.fn();
    const context = {
      clearRect,
      createImageData
    } as unknown as CanvasRenderingContext2D;

    renderHeatmapOverlay(context, 320, 200, []);

    expect(clearRect).toHaveBeenCalledWith(0, 0, 320, 200);
    expect(createImageData).not.toHaveBeenCalled();
  });

  it("renders sampled heatmap pixels via offscreen canvas", () => {
    const clearRect = vi.fn();
    const createImageData = vi.fn(
      (width: number, height: number) => ({
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4)
      }) as ImageData
    );
    const drawImage = vi.fn();
    const context = {
      clearRect,
      createImageData,
      drawImage,
      imageSmoothingEnabled: false
    } as unknown as CanvasRenderingContext2D;

    const putImageData = vi.fn();
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ putImageData } as unknown as CanvasRenderingContext2D))
    } as unknown as HTMLCanvasElement;

    const createElement = vi.fn(() => fakeCanvas);
    vi.stubGlobal("document", { createElement });

    renderHeatmapOverlay(
      context,
      16,
      12,
      [{
        x: 8, y: 6, count: 5,
        id: "",
        intensity: 0
      }],
      { sampleStep: 4, maxContourRadius: 18 }
    );

    expect(createElement).toHaveBeenCalledWith("canvas");
    expect(createImageData).toHaveBeenCalledWith(4, 3);
    expect(putImageData).toHaveBeenCalled();
    expect(context.imageSmoothingEnabled).toBe(true);
    expect(drawImage).toHaveBeenCalled();
  });

  it("stops rendering when offscreen context is unavailable", () => {
    const drawImage = vi.fn();
    const createImageData = vi.fn(
      (width: number, height: number) => ({
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4)
      }) as ImageData
    );
    const context = {
      clearRect: vi.fn(),
      createImageData,
      drawImage,
      imageSmoothingEnabled: false
    } as unknown as CanvasRenderingContext2D;

    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => null)
    } as unknown as HTMLCanvasElement;
    const createElement = vi.fn(() => fakeCanvas);
    vi.stubGlobal("document", { createElement });

    renderHeatmapOverlay(context, 10, 10, [{
      x: 5, y: 5, count: 2,
      id: "",
      intensity: 0
    }], { sampleStep: 5 });

    expect(drawImage).not.toHaveBeenCalled();
  });
});
