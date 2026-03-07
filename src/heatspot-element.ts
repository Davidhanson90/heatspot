import { LitElement, css, html } from "lit";

import { HeatmapTracker } from "./core/heatmap-tracker.js";
import { ELEMENT_TRACKER_CONFIG } from "./constants/constants.js";
import { type HeatmapToolbarMode } from "./contracts/heatmap-contracts.js";
import { renderHeatmapOverlay } from "./rendering/renderer.js";

export class HeatSpotElement extends LitElement {
  static properties = {
    heatmapVisible: { state: true },
    toolbar: { type: String, reflect: true }
  };

  declare private heatmapVisible: boolean;
  declare private toolbar: HeatmapToolbarMode;

  private drawLoopId: number | null = null;

  private readonly tracker = new HeatmapTracker(ELEMENT_TRACKER_CONFIG);

  static styles = css`
    :host {
      position: relative;
      display: block;
      min-height: 220px;
      border-radius: 12px;
      overflow: hidden;
      isolation: isolate;
      background: #f4f7ff;
    }

    .surface {
      position: relative;
      min-height: inherit;
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    .toggle {
      position: absolute;
      top: 0.55rem;
      left: 0.55rem;
      width: 1.9rem;
      height: 1.9rem;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.5);
      background: rgba(15, 23, 42, 0.82);
      color: #ffffff;
      padding: 0;
      line-height: 1;
      font-size: 0.92rem;
      font-weight: 700;
      cursor: pointer;
      z-index: 10001;
    }

    .toggle:hover {
      background: rgba(2, 6, 23, 0.95);
    }

    .overlay {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10000;
    }
  `;

  constructor() {
    super();
    this.heatmapVisible = false;
    this.toolbar = "simple";
  }

  /**
   * Stops frame rendering when element leaves the document.
   */
  disconnectedCallback(): void {
    this.stopDrawLoop();
    super.disconnectedCallback();
  }

  /**
   * Starts or stops rendering based on the overlay visibility.
   */
  updated(): void {
    if (this.toolbar !== "simple" && this.toolbar !== "hidden") {
      this.toolbar = "simple";
    }

    if (this.heatmapVisible) {
      this.startDrawLoop();
      return;
    }

    this.stopDrawLoop();
  }

  /**
   * Toggles heatmap overlay visibility.
   */
  private toggleHeatmap(): void {
    this.heatmapVisible = !this.heatmapVisible;
  }

  /**
   * Tracks pointer motion while overlay is hidden.
   */
  private onPointerMove(event: PointerEvent): void {
    if (this.heatmapVisible) {
      return;
    }

    const surface = this.renderRoot.querySelector<HTMLElement>(".surface");
    if (!surface) {
      return;
    }

    const rect = surface.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const x = Math.min(rect.width, Math.max(0, event.clientX - rect.left));
    const y = Math.min(rect.height, Math.max(0, event.clientY - rect.top));
    this.tracker.recordPosition(x, y, { width: rect.width, height: rect.height });
  }

  /**
   * Creates a requestAnimationFrame loop for continuous heatmap drawing.
   */
  private startDrawLoop(): void {
    if (this.drawLoopId !== null) {
      return;
    }

    const drawFrame = () => {
      this.drawHeatmap();
      this.drawLoopId = window.requestAnimationFrame(drawFrame);
    };

    this.drawLoopId = window.requestAnimationFrame(drawFrame);
  }

  /**
   * Stops the active requestAnimationFrame drawing loop.
   */
  private stopDrawLoop(): void {
    if (this.drawLoopId === null) {
      return;
    }

    window.cancelAnimationFrame(this.drawLoopId);
    this.drawLoopId = null;
  }

  /**
   * Renders the latest tracked hotspot data onto the overlay canvas.
   */
  private drawHeatmap(): void {
    const canvas = this.renderRoot.querySelector<HTMLCanvasElement>("#heatmap");
    const surface = this.renderRoot.querySelector<HTMLElement>(".surface");
    if (!canvas || !surface) {
      return;
    }

    const width = Math.round(surface.clientWidth);
    const height = Math.round(surface.clientHeight);
    if (width <= 0 || height <= 0) {
      return;
    }

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const snapshot = this.tracker.getSnapshot();
    renderHeatmapOverlay(context, width, height, snapshot.hotspots);
  }

  render() {
    return html`
      <div class="surface" @pointermove=${this.onPointerMove}>
        <slot></slot>
      </div>
      ${this.toolbar === "hidden"
        ? null
        : html`<button class="toggle" @click=${this.toggleHeatmap} aria-label="Toggle heatmap">
            ${this.heatmapVisible ? "x" : "*"}
          </button>`}
      ${this.heatmapVisible ? html`<canvas id="heatmap" class="overlay"></canvas>` : null}
    `;
  }
}

if (typeof customElements !== "undefined" && !customElements.get("heat-spot")) {
  customElements.define("heat-spot", HeatSpotElement);
}
