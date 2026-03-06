export type HeatColor = readonly [number, number, number];

export interface HeatmapRenderOptions {
  sampleStep?: number;
  maxContourRadius?: number;
  colors?: readonly HeatColor[];
}
