import {
  type HeatmapConfig,
  type HeatmapHotspot,
  type HeatmapSnapshot,
  type ViewportSize
} from "../contracts/heatmap-contracts.js";
import {
  DEFAULT_HEATMAP_CONFIG,
  MIN_MAX_HOTSPOTS,
  MIN_MERGE_RADIUS
} from "../constants/constants.js";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getDistanceSquared(aX: number, aY: number, bX: number, bY: number): number {
  const dX = aX - bX;
  const dY = aY - bY;
  return dX * dX + dY * dY;
}

function normalizeWeight(weight: number): number {
  if (!Number.isFinite(weight)) {
    return 1;
  }

  return Math.max(1, Math.floor(weight));
}

/**
 * Stores and aggregates pointer samples into clustered hotspots.
 * Positions are stored as normalized 0–1 coordinates and remapped to the
 * current viewport when a snapshot is requested.
 */
export class HeatmapTracker {
  private config: HeatmapConfig;

  private sampleCount = 0;

  private trackedSince: number | null = null;

  private latestViewport: ViewportSize = { width: 0, height: 0 };

  private readonly trackedHotspots: HeatmapHotspot[] = [];

  private nextHotspotId = 0;

  constructor(initialConfig: Partial<HeatmapConfig> = {}) {
    this.config = { ...DEFAULT_HEATMAP_CONFIG };
    this.configure(initialConfig);
  }

  /**
   * Updates clustering configuration.
   */
  configure(nextConfig: Partial<HeatmapConfig>): void {
    const mergeRadius = nextConfig.mergeRadius ?? this.config.mergeRadius;
    const maxHotspots = nextConfig.maxHotspots ?? this.config.maxHotspots;

    this.config = {
      mergeRadius: Math.max(MIN_MERGE_RADIUS, mergeRadius),
      maxHotspots: Math.max(MIN_MAX_HOTSPOTS, Math.floor(maxHotspots))
    };
  }

  /**
   * Updates the viewport used to project stored hotspots into pixel space.
   */
  updateViewport(viewport: ViewportSize): void {
    if (viewport.width <= 0 || viewport.height <= 0) {
      return;
    }

    this.latestViewport = { width: viewport.width, height: viewport.height };
  }

  /**
   * Records a pointer position and merges it into the nearest hotspot.
   * Incoming `x`/`y` values are pixels; they are stored normalized to `viewport`.
   * `weight` counts as multiple samples at the same point (used for clicks).
   */
  recordPosition(x: number, y: number, viewport: ViewportSize, weight = 1): void {
    if (viewport.width <= 0 || viewport.height <= 0) {
      return;
    }

    const sampleWeight = normalizeWeight(weight);
    const clampedX = clamp(x, 0, viewport.width);
    const clampedY = clamp(y, 0, viewport.height);
    const normX = clampedX / viewport.width;
    const normY = clampedY / viewport.height;
    const mergeRadiusSquared = this.config.mergeRadius * this.config.mergeRadius;

    let closest: HeatmapHotspot | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const hotspot of this.trackedHotspots) {
      const pixelX = hotspot.x * viewport.width;
      const pixelY = hotspot.y * viewport.height;
      const distance = getDistanceSquared(clampedX, clampedY, pixelX, pixelY);
      if (distance <= mergeRadiusSquared && distance < closestDistance) {
        closest = hotspot;
        closestDistance = distance;
      }
    }

    if (closest) {
      const nextCount = closest.count + sampleWeight;
      closest.x = (closest.x * closest.count + normX * sampleWeight) / nextCount;
      closest.y = (closest.y * closest.count + normY * sampleWeight) / nextCount;
      closest.count = nextCount;
    } else {
      this.trackedHotspots.push({
        id: `hs-${this.nextHotspotId++}`,
        x: normX,
        y: normY,
        count: sampleWeight,
        intensity: 0
      });
    }

    if (this.trackedHotspots.length > this.config.maxHotspots) {
      this.trackedHotspots.sort((a, b) => a.count - b.count);
      this.trackedHotspots.shift();
    }

    this.sampleCount += sampleWeight;
    this.latestViewport = { width: viewport.width, height: viewport.height };

    if (this.trackedSince === null) {
      this.trackedSince = Date.now();
    }
  }

  /**
   * Clears all tracked samples and hotspots.
   */
  reset(): void {
    this.sampleCount = 0;
    this.trackedSince = null;
    this.latestViewport = { width: 0, height: 0 };
    this.trackedHotspots.length = 0;
  }

  /**
   * Returns a snapshot suitable for rendering or analytics.
   * Hotspot `x`/`y` values are pixels for the current viewport.
   */
  getSnapshot(): HeatmapSnapshot {
    let maxCount = 0;

    for (const hotspot of this.trackedHotspots) {
      if (hotspot.count > maxCount) {
        maxCount = hotspot.count;
      }
    }

    const width = this.latestViewport.width;
    const height = this.latestViewport.height;
    const hotspots = this.trackedHotspots
      .map((hotspot) => ({
        ...hotspot,
        x: hotspot.x * width,
        y: hotspot.y * height,
        intensity: maxCount === 0 ? 0 : hotspot.count / maxCount
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalSamples: this.sampleCount,
      trackedSince: this.trackedSince,
      viewport: { ...this.latestViewport },
      hotspots
    };
  }
}
