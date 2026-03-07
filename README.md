# heatspot

[![npm version](https://img.shields.io/npm/v/heatspot.svg)](https://www.npmjs.com/package/heatspot)
[![npm downloads](https://img.shields.io/npm/dm/heatspot.svg)](https://www.npmjs.com/package/heatspot)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-%233178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![license](https://img.shields.io/github/license/Davidhanson90/heatspot.svg)](LICENSE)
[![verify](https://github.com/Davidhanson90/heatspot/actions/workflows/verify-main.yml/badge.svg)](https://github.com/Davidhanson90/heatspot/actions/workflows/verify-main.yml)

`heatspot` is an ESM TypeScript library for capturing pointer heat data and rendering an embeddable heatmap web component.

## Features

- ESM package output with TypeScript declarations
- Pointer heat tracking utility API
- Reusable `<heat-spot>` component with slot-based content
- Built-in toggle icon (top-left) to show heat overlay
- Configurable `toolbar` attribute: `simple` (default) or `hidden`

## Installation

```bash
npm install heatspot
```

## Usage

### 1. Import the library

```ts
import "heatspot";
```

The `heat-spot` custom element is registered on import.

### 2. Render the component

```html
<heat-spot toolbar="simple">
  <section>
    <h2>Example Panel</h2>
    <p>Move the mouse over this area, then click the icon in the top-left.</p>
  </section>
</heat-spot>
```

`toolbar` options:

- `simple` - show the heatmap toggle icon
- `hidden` - hide the heatmap toggle icon

Example with hidden toolbar:

```html
<heat-spot toolbar="hidden">
  <section>
    <h2>Passive Tracking Panel</h2>
    <p>The heatmap toggle icon is not rendered in this mode.</p>
  </section>
</heat-spot>
```

### Example

![example.jpg](https://raw.githubusercontent.com/Davidhanson90/heatspot/main/assets/example.jpg)

### 3. Read heatmap data from a `<heat-spot>` element

```ts
const element = document.querySelector<HeatSpotElement>('heat-spot');

const snapshot = element.getHeatmapData();

console.log(snapshot);
```

Example data shape:

```json
{
  "totalSamples": 42,
  "trackedSince": 1741351200000,
  "viewport": { "width": 960, "height": 540 },
  "hotspots": [
    {
      "id": "hs-0",
      "x": 418.2,
      "y": 225.6,
      "count": 18,
      "intensity": 1
    },
    {
      "id": "hs-1",
      "x": 701.1,
      "y": 392.8,
      "count": 9,
      "intensity": 0.5
    }
  ]
}
```

### 4. Optional global tracking API

```ts
import {
  configureMouseHeatmap,
  getMouseHeatmapData,
  resetMouseHeatmap,
  startMouseTracking,
  stopMouseTracking
} from "heatspot";

configureMouseHeatmap({ mergeRadius: 24, maxHotspots: 450 });
startMouseTracking();

const snapshot = getMouseHeatmapData();
console.log(snapshot.hotspots);

stopMouseTracking();
resetMouseHeatmap();
```

### 5. Export the heatmap visualization as an image

```ts
const element = document.querySelector<HeatSpotElement>("heat-spot");

if (element) {
  const imageDataUrl = element.getHeatmapImage();

  if (imageDataUrl) {
    console.log(imageDataUrl);
    // Example prefix:
    // data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...

    // Optional download example
    const link = document.createElement("a");
    link.href = imageDataUrl;
    link.download = "heatmap.png";
    link.click();
  }
}
```

`getHeatmapImage()` returns:

- A `data:` URL string when the component has measurable dimensions.
- `null` if the element has no measurable surface yet (for example, hidden or not laid out).

## Scripts

- `npm run build` - compile library to `dist/`
- `npm run test` - run Vitest tests
- `npm run test:coverage` - run tests with coverage reports in `coverage/`
- `npm run build:verify` - run tests and harness build
- `npm run pack:check` - show package contents using `npm pack --dry-run`

## Development

```bash
npm install
npm start
```

## License

MIT
