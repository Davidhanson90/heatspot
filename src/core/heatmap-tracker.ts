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

/**
 * Stores and aggregates pointer samples into clustered hotspots.
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
   * Records a pointer position and merges it into the nearest hotspot.
   */
  recordPosition(x: number, y: number, viewport: ViewportSize): void {
    if (viewport.width <= 0 || viewport.height <= 0) {
      return;
    }

    const clampedX = clamp(x, 0, viewport.width);
    const clampedY = clamp(y, 0, viewport.height);
    const mergeRadiusSquared = this.config.mergeRadius * this.config.mergeRadius;

    let closest: HeatmapHotspot | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const hotspot of this.trackedHotspots) {
      const distance = getDistanceSquared(clampedX, clampedY, hotspot.x, hotspot.y);
      if (distance <= mergeRadiusSquared && distance < closestDistance) {
        closest = hotspot;
        closestDistance = distance;
      }
    }

    if (closest) {
      const nextCount = closest.count + 1;
      closest.x = (closest.x * closest.count + clampedX) / nextCount;
      closest.y = (closest.y * closest.count + clampedY) / nextCount;
      closest.count = nextCount;
    } else {
      this.trackedHotspots.push({
        id: `hs-${this.nextHotspotId++}`,
        x: clampedX,
        y: clampedY,
        count: 1,
        intensity: 0
      });
    }

    if (this.trackedHotspots.length > this.config.maxHotspots) {
      this.trackedHotspots.sort((a, b) => a.count - b.count);
      this.trackedHotspots.shift();
    }

    this.sampleCount += 1;
    this.latestViewport = viewport;

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
   */
  getSnapshot(): HeatmapSnapshot {
    let maxCount = 0;

    for (const hotspot of this.trackedHotspots) {
      if (hotspot.count > maxCount) {
        maxCount = hotspot.count;
      }
    }

    const hotspots = this.trackedHotspots
      .map((hotspot) => ({
        ...hotspot,
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
