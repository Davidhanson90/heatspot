# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added

- Primary clicks and taps now record a weighted sample (3× a move sample) so discrete interactions show up on the heatmap.
- `HeatmapTracker` stores hotspot positions as normalized 0–1 coordinates and remaps them to the current viewport, keeping blobs aligned after resize.
- `<heat-spot>` observes its surface with `ResizeObserver` and redraws when the element size changes.

### Changed

- Pointer tracking continues while the heatmap overlay is visible.
- Overlay rendering uses a dirty flag and a single `requestAnimationFrame` instead of a continuous draw loop.
- Removed the leftover `hello` export.

## 0.2.3

### Added

- Added `getHeatmapData()` to `<heat-spot>` for extracting the current heatmap snapshot (`totalSamples`, `trackedSince`, `viewport`, `hotspots`).
- Added `getHeatmapImage()` to `<heat-spot>` for exporting the current heatmap visualization as a data URL image.
- Added harness download controls to export heatmap data as `heatmap-data.json` and the visualization as `heatmap.png`.

### Changed

- Expanded README documentation with usage examples for `getHeatmapData()` and `getHeatmapImage()`, including sample output structure.

## 0.2.0

### Changed

- Renamed the web component source file from `heatmap-element` to `heatspot-element`.
- Renamed the exported component class from `HeatMapElement` to `HeatSpotElement`.
- Updated the custom element selector from `<heat-map>` to `<heat-spot>`.
- Updated the harness and README usage examples to use `<heat-spot>`.
