import { type HeatmapConfig } from "../contracts/heatmap-contracts.js";
import { type HeatColor } from "../contracts/rendering-contracts.js";

/**
 * Default clustering configuration used by the global tracker API.
 */
export const DEFAULT_HEATMAP_CONFIG: HeatmapConfig = {
  mergeRadius: 28,
  maxHotspots: 400
};

/** Minimum allowed hotspot merge radius in pixels. */
export const MIN_MERGE_RADIUS = 4;

/** Minimum allowed hotspot storage size for a tracker instance. */
export const MIN_MAX_HOTSPOTS = 20;

/**
 * Tracker configuration used by the `heat-map` web component instance.
 */
export const ELEMENT_TRACKER_CONFIG: HeatmapConfig = {
  mergeRadius: 24,
  maxHotspots: 450
};

/**
 * Ordered heat palette from coolest to hottest.
 */
export const DEFAULT_HEAT_COLORS: readonly HeatColor[] = [
  [20, 34, 120],
  [0, 145, 255],
  [0, 200, 125],
  [255, 225, 70],
  [255, 140, 30],
  [225, 35, 30],
  [255, 255, 255]
] as const;

/**
 * Discrete contour levels used to pick the dominant output heat color.
 */
export const DOMINANT_HEAT_LEVELS = [0.2, 0.35, 0.5, 0.65, 0.8, 1] as const;

/** Exponent used to bias relative hotspot strength scaling. */
export const RELATIVE_STRENGTH_EXPONENT = 0.85;

/** Max normalized distance multiplier for hotspot influence cutoff. */
export const FIELD_DISTANCE_MULTIPLIER = 2.2;

/** Falloff divisor controlling Gaussian-style strength decay around hotspots. */
export const FIELD_FALLOFF_DIVISOR = 0.8;

/** Strength below this value is treated as low-heat rendering. */
export const LOW_HEAT_THRESHOLD = 0.05;

/** Alpha used for low-heat visible floor color. */
export const LOW_HEAT_ALPHA = 0.16;

/** Base alpha for dominant contour color levels. */
export const HEAT_ALPHA_BASE = 0.22;

/** Additional alpha multiplier per dominant contour level. */
export const HEAT_ALPHA_MULTIPLIER = 0.45;

/** Alpha used for maximum heat color output. */
export const MAX_HEAT_ALPHA = 0.68;

/** Sampling step in pixels for rasterized heat field rendering. */
export const DEFAULT_SAMPLE_STEP = 4;

/** Minimum contour radius in pixels for visible heat blobs. */
export const MIN_CONTOUR_RADIUS = 14;

/** Height/width ratio used to derive contour radius from viewport size. */
export const CONTOUR_RADIUS_RATIO = 0.07;
