import { LitElement, css, html } from "lit";

import { HeatmapTracker } from "./core/heatmap-tracker.js";
import { CLICK_SAMPLE_WEIGHT, ELEMENT_TRACKER_CONFIG } from "./constants/constants.js";
import { type HeatmapSnapshot, type HeatmapToolbarMode } from "./contracts/heatmap-contracts.js";
import { renderHeatmapOverlay } from "./rendering/renderer.js";

export class HeatSpotElement extends LitElement {
  static properties = {
    heatmapVisible: { state: true },
    toolbar: { type: String, reflect: true }
  };

  declare private heatmapVisible: boolean;
  declare private toolbar: HeatmapToolbarMode;

  private needsDraw = false;

  private drawFrameId: number | null = null;

  private resizeObserver: ResizeObserver | null = null;

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
      cursor: pointer;
      z-index: 10001;
      opacity: 0.72;
      transition: opacity 180ms ease;
      display: grid;
      place-items: center;
    }

    .toggle:hover {
      opacity: 1;
    }

    .toggle-icon {
      width: 0.95rem;
      height: 0.95rem;
      fill: currentColor;
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
   * Returns the current tracked heatmap snapshot for this element instance.
   */
  getHeatmapData(): HeatmapSnapshot {
    return this.tracker.getSnapshot();
  }

  /**
   * Renders the current heatmap visualization into an image data URL.
   */
  getHeatmapImage(options: { type?: string; quality?: number } = {}): string | null {
    const surface = this.renderRoot.querySelector<HTMLElement>(".surface");
    if (!surface) {
      return null;
    }

    const width = Math.round(surface.clientWidth);
    const height = Math.round(surface.clientHeight);
    if (width <= 0 || height <= 0) {
      return null;
    }

    const imageCanvas = document.createElement("canvas");
    imageCanvas.width = width;
    imageCanvas.height = height;
    const context = imageCanvas.getContext("2d");
    if (!context) {
      return null;
    }

    const snapshot = this.tracker.getSnapshot();
    renderHeatmapOverlay(context, width, height, snapshot.hotspots);

    return imageCanvas.toDataURL(options.type ?? "image/png", options.quality);
  }

  connectedCallback(): void {
    super.connectedCallback();
    void this.updateComplete.then(() => {
      if (this.isConnected) {
        this.ensureResizeObserver();
      }
    });
  }

  /**
   * Stops scheduled rendering and resize observation when the element leaves the document.
   */
  disconnectedCallback(): void {
    this.cancelScheduledDraw();
    this.teardownResizeObserver();
    super.disconnectedCallback();
  }

  protected firstUpdated(): void {
    this.ensureResizeObserver();
  }

  /**
   * Starts a single draw when the overlay becomes visible.
   */
  updated(): void {
    if (this.toolbar !== "simple" && this.toolbar !== "hidden") {
      this.toolbar = "simple";
    }

    if (this.heatmapVisible) {
      this.needsDraw = true;
      this.scheduleDraw();
      return;
    }

    this.cancelScheduledDraw();
  }

  /**
   * Toggles heatmap overlay visibility.
   */
  private toggleHeatmap(): void {
    this.heatmapVisible = !this.heatmapVisible;
  }

  /**
   * Tracks pointer motion, including while the overlay is visible.
   */
  private onPointerMove(event: PointerEvent): void {
    this.recordPointerEvent(event);
  }

  /**
   * Records a weighted sample for a primary click or tap.
   */
  private onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }

    this.recordPointerEvent(event, CLICK_SAMPLE_WEIGHT);
  }

  /**
   * Converts a pointer event into a tracker sample in surface coordinates.
   */
  private recordPointerEvent(event: PointerEvent, weight = 1): void {
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
    this.tracker.recordPosition(x, y, { width: rect.width, height: rect.height }, weight);
    this.needsDraw = true;
    this.scheduleDraw();
  }

  /**
   * Observes the surface so stored hotspots remap when the element resizes.
   */
  private ensureResizeObserver(): void {
    if (this.resizeObserver || typeof ResizeObserver === "undefined") {
      return;
    }

    const surface = this.renderRoot.querySelector<HTMLElement>(".surface");
    if (!surface) {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.onSurfaceResize();
    });
    this.resizeObserver.observe(surface);
  }

  /**
   * Updates the tracker viewport from the current surface size and redraws if needed.
   */
  private onSurfaceResize(): void {
    const surface = this.renderRoot.querySelector<HTMLElement>(".surface");
    if (!surface) {
      return;
    }

    const rect = surface.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    this.tracker.updateViewport({ width: rect.width, height: rect.height });
    this.needsDraw = true;
    this.scheduleDraw();
  }

  private teardownResizeObserver(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  /**
   * Requests one animation frame to draw when the overlay is visible and dirty.
   */
  private scheduleDraw(): void {
    if (!this.heatmapVisible || this.drawFrameId !== null) {
      return;
    }

    this.drawFrameId = window.requestAnimationFrame(() => {
      this.drawFrameId = null;
      if (!this.needsDraw || !this.heatmapVisible) {
        return;
      }

      this.needsDraw = false;
      this.drawHeatmap();
    });
  }

  /**
   * Cancels a pending draw frame, if any.
   */
  private cancelScheduledDraw(): void {
    if (this.drawFrameId === null) {
      return;
    }

    window.cancelAnimationFrame(this.drawFrameId);
    this.drawFrameId = null;
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
      <div class="surface" @pointermove=${this.onPointerMove} @pointerdown=${this.onPointerDown}>
        <slot></slot>
      </div>
      ${this.toolbar === "hidden"
        ? null
        : html`<button class="toggle" @click=${this.toggleHeatmap} aria-label="Toggle heatmap">
            <svg
              class="toggle-icon"
              viewBox="0 0 24 24"
              role="img"
              aria-label="Heatmap fire icon"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2.5c.4 2.3-.2 3.9-1.3 5.3-1.2 1.5-2.6 2.9-2.6 5.3 0 2.2 1.8 4 3.9 4 .8 0 1.6-.2 2.2-.6-1.1-.4-1.9-1.5-1.9-2.8 0-1.9 1.6-3 2.7-4.4.8-1 .9-2.1.8-3.3 2.3 1.5 4.2 4 4.2 7.1 0 4.2-3.4 7.6-7.6 7.6S4.8 17.3 4.8 13.1c0-4.3 2.5-6.7 4.5-8.7C10.4 3.3 11.2 2.6 12 2.5z"
              />
            </svg>
          </button>`}
      ${this.heatmapVisible ? html`<canvas id="heatmap" class="overlay"></canvas>` : null}
    `;
  }
}

if (typeof customElements !== "undefined" && !customElements.get("heat-spot")) {
  customElements.define("heat-spot", HeatSpotElement);
}
