import { type HeatmapHotspot } from "../contracts/heatmap-contracts.js";
import { type HeatColor, type HeatmapRenderOptions } from "../contracts/rendering-contracts.js";
import {
  CONTOUR_RADIUS_RATIO,
  DEFAULT_HEAT_COLORS,
  DEFAULT_SAMPLE_STEP,
  DOMINANT_HEAT_LEVELS,
  FIELD_DISTANCE_MULTIPLIER,
  FIELD_FALLOFF_DIVISOR,
  HEAT_ALPHA_BASE,
  HEAT_ALPHA_MULTIPLIER,
  LOW_HEAT_ALPHA,
  LOW_HEAT_THRESHOLD,
  MAX_HEAT_ALPHA,
  MIN_CONTOUR_RADIUS,
  RELATIVE_STRENGTH_EXPONENT
} from "../constants/constants.js";

/**
 * Converts an absolute hotspot count into a relative strength ratio.
 */
export function getRelativeStrength(count: number, maxCount: number): number {
  if (maxCount <= 0) {
    return 0;
  }

  return Math.pow(count / maxCount, RELATIVE_STRENGTH_EXPONENT);
}

/**
 * Interpolates the heat scale into a single RGB color.
 */
export function interpolateHeatColor(
  strength: number,
  colors: readonly HeatColor[] = DEFAULT_HEAT_COLORS
): [number, number, number] {
  const segments = colors.length - 1;
  const scaled = Math.max(0, Math.min(1, strength)) * segments;
  const lowerIndex = Math.floor(scaled);
  const upperIndex = Math.min(segments, lowerIndex + 1);
  const localT = scaled - lowerIndex;
  const low = colors[lowerIndex];
  const high = colors[upperIndex];

  return [
    Math.round(low[0] + (high[0] - low[0]) * localT),
    Math.round(low[1] + (high[1] - low[1]) * localT),
    Math.round(low[2] + (high[2] - low[2]) * localT)
  ];
}

/**
 * Calculates merged field strength at a specific coordinate.
 */
export function calculateFieldStrength(
  x: number,
  y: number,
  hotspots: Array<{ x: number; y: number; count: number }>,
  radius: number,
  maxHotspotCount: number
): number {
  const radiusSquared = radius * radius;
  let strength = 0;

  for (const spot of hotspots) {
    const dx = x - spot.x;
    const dy = y - spot.y;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared > radiusSquared * FIELD_DISTANCE_MULTIPLIER) {
      continue;
    }

    const localStrength = getRelativeStrength(spot.count, maxHotspotCount);
    const falloff = Math.exp(-distanceSquared / (radiusSquared * FIELD_FALLOFF_DIVISOR));
    strength += localStrength * falloff;
  }

  return Math.min(1, strength);
}

/**
 * Maps field strength into a discrete dominant color and alpha.
 */
export function getDominantHeatColor(
  strength: number,
  colors: readonly HeatColor[] = DEFAULT_HEAT_COLORS
): [number, number, number, number] {
  if (strength <= 0) {
    return [0, 0, 0, 0];
  }

  if (strength < LOW_HEAT_THRESHOLD) {
    const [r, g, b] = interpolateHeatColor(0, colors);
    return [r, g, b, LOW_HEAT_ALPHA];
  }

  for (const level of DOMINANT_HEAT_LEVELS) {
    if (strength <= level) {
      const [r, g, b] = interpolateHeatColor(level, colors);
      return [r, g, b, HEAT_ALPHA_BASE + level * HEAT_ALPHA_MULTIPLIER];
    }
  }

  const [r, g, b] = interpolateHeatColor(1, colors);
  return [r, g, b, MAX_HEAT_ALPHA];
}

/**
 * Draws a contour-style heatmap overlay from hotspots onto a canvas context.
 */
export function renderHeatmapOverlay(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  hotspots: HeatmapHotspot[],
  options: HeatmapRenderOptions = {}
): void {
  context.clearRect(0, 0, width, height);

  if (hotspots.length === 0) {
    return;
  }

  const sampleStep = options.sampleStep ?? DEFAULT_SAMPLE_STEP;
  const maxContourRadius =
    options.maxContourRadius ?? Math.max(MIN_CONTOUR_RADIUS, Math.min(width, height) * CONTOUR_RADIUS_RATIO);
  const colors = options.colors ?? DEFAULT_HEAT_COLORS;
  const maxHotspotCount = hotspots.reduce((max, spot) => Math.max(max, spot.count), 1);

  const sampleWidth = Math.ceil(width / sampleStep);
  const sampleHeight = Math.ceil(height / sampleStep);
  const image = context.createImageData(sampleWidth, sampleHeight);

  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const sampleX = x * sampleStep;
      const sampleY = y * sampleStep;
      const strength = calculateFieldStrength(sampleX, sampleY, hotspots, maxContourRadius, maxHotspotCount);
      const [r, g, b, a] = getDominantHeatColor(strength, colors);
      const index = (y * sampleWidth + x) * 4;

      image.data[index] = r;
      image.data[index + 1] = g;
      image.data[index + 2] = b;
      image.data[index + 3] = Math.round(a * 255);
    }
  }

  const offscreen = document.createElement("canvas");
  offscreen.width = sampleWidth;
  offscreen.height = sampleHeight;
  const offscreenContext = offscreen.getContext("2d");
  if (!offscreenContext) {
    return;
  }

  offscreenContext.putImageData(image, 0, 0);
  context.imageSmoothingEnabled = true;
  context.drawImage(offscreen, 0, 0, sampleWidth, sampleHeight, 0, 0, width, height);
}
