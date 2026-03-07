# Changelog

All notable changes to this project will be documented in this file.

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
