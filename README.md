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

### 3. Optional tracking API

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
