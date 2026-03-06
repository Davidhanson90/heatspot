export interface ViewportSize {
  width: number;
  height: number;
}

export interface HeatmapConfig {
  mergeRadius: number;
  maxHotspots: number;
}

export type HeatmapToolbarMode = "simple" | "hidden";

export interface HeatmapHotspot {
  id: string;
  x: number;
  y: number;
  count: number;
  intensity: number;
}

export interface HeatmapSnapshot {
  totalSamples: number;
  trackedSince: number | null;
  viewport: ViewportSize;
  hotspots: HeatmapHotspot[];
}
