/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";

import "./heatspot-element.js";
import * as renderer from "./rendering/renderer.js";

describe("heat-spot component", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("toggles overlay visibility with icon button", async () => {
    const requestFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation(() => {
        return 1;
      });
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    try {
      const element = document.createElement("heat-spot") as HTMLElement & {
        updateComplete: Promise<unknown>;
      };

      document.body.appendChild(element);
      await element.updateComplete;

      const button = element.shadowRoot?.querySelector<HTMLButtonElement>("button.toggle");
      expect(button).not.toBeNull();
      expect(element.shadowRoot?.querySelector("canvas#heatmap")).toBeNull();

      button?.click();
      await element.updateComplete;

      expect(element.shadowRoot?.querySelector("canvas#heatmap")).not.toBeNull();

      button?.click();
      await element.updateComplete;

      expect(element.shadowRoot?.querySelector("canvas#heatmap")).toBeNull();
      element.remove();
    } finally {
      requestFrame.mockRestore();
      cancelFrame.mockRestore();
    }
  });

  it("hides the heatmap icon when toolbar is hidden", async () => {
    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
    };

    element.setAttribute("toolbar", "hidden");
    document.body.appendChild(element);
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector("button.toggle")).toBeNull();
    element.remove();
  });

  it("records pointer movement while hidden", async () => {
    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      tracker: {
        getSnapshot: () => { totalSamples: number };
      };
    };

    document.body.appendChild(element);
    await element.updateComplete;

    const surface = element.shadowRoot?.querySelector<HTMLElement>(".surface");
    expect(surface).not.toBeNull();

    vi.spyOn(surface as HTMLElement, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 300,
      bottom: 220,
      width: 300,
      height: 220,
      toJSON: () => ({})
    });

    surface?.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 40, clientY: 35 }));

    expect(element.tracker.getSnapshot().totalSamples).toBe(1);
    element.remove();
  });

  it("exposes heatmap snapshot data through getHeatmapData", async () => {
    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      getHeatmapData: () => {
        totalSamples: number;
        trackedSince: number | null;
        viewport: { width: number; height: number };
        hotspots: Array<{ id: string; x: number; y: number; count: number; intensity: number }>;
      };
    };

    document.body.appendChild(element);
    await element.updateComplete;

    const surface = element.shadowRoot?.querySelector<HTMLElement>(".surface");
    expect(surface).not.toBeNull();

    vi.spyOn(surface as HTMLElement, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 300,
      bottom: 220,
      width: 300,
      height: 220,
      toJSON: () => ({})
    });

    surface?.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 40, clientY: 35 }));

    const snapshot = element.getHeatmapData();
    expect(snapshot.totalSamples).toBe(1);
    expect(snapshot.trackedSince).not.toBeNull();
    expect(snapshot.viewport).toEqual({ width: 300, height: 220 });
    expect(snapshot.hotspots.length).toBe(1);
    expect(snapshot.hotspots[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        x: 40,
        y: 35,
        count: 1,
        intensity: 1
      })
    );
  });

  it("exports a heatmap image data URL through getHeatmapImage", async () => {
    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      getHeatmapImage: (options?: { type?: string; quality?: number }) => string | null;
    };

    document.body.appendChild(element);
    await element.updateComplete;

    const surface = element.shadowRoot?.querySelector<HTMLElement>(".surface");
    expect(surface).not.toBeNull();

    vi.spyOn(surface as HTMLElement, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 300,
      bottom: 220,
      width: 300,
      height: 220,
      toJSON: () => ({})
    });

    surface?.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 40, clientY: 35 }));

    Object.defineProperty(surface as HTMLElement, "clientWidth", { configurable: true, value: 300 });
    Object.defineProperty(surface as HTMLElement, "clientHeight", { configurable: true, value: 220 });

    const context = { clearRect: vi.fn() } as unknown as CanvasRenderingContext2D;
    const toDataURL = vi.fn(() => "data:image/png;base64,fake");
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toDataURL
    } as unknown as HTMLCanvasElement;

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName.toLowerCase() === "canvas") {
        return fakeCanvas;
      }

      return originalCreateElement(tagName);
    });

    const renderSpy = vi.spyOn(renderer, "renderHeatmapOverlay").mockImplementation(() => {});

    const image = element.getHeatmapImage();

    expect(image).toBe("data:image/png;base64,fake");
    expect(renderSpy).toHaveBeenCalledWith(context, 300, 220, expect.any(Array));
    expect(toDataURL).toHaveBeenCalledWith("image/png", undefined);
  });

  it("returns null from getHeatmapImage when surface size is not measurable", async () => {
    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      getHeatmapImage: () => string | null;
    };

    document.body.appendChild(element);
    await element.updateComplete;

    const surface = element.shadowRoot?.querySelector<HTMLElement>(".surface");
    expect(surface).not.toBeNull();

    Object.defineProperty(surface as HTMLElement, "clientWidth", { configurable: true, value: 0 });
    Object.defineProperty(surface as HTMLElement, "clientHeight", { configurable: true, value: 0 });

    expect(element.getHeatmapImage()).toBeNull();
  });

  it("normalizes unsupported toolbar values", async () => {
    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      toolbar: string;
    };

    element.setAttribute("toolbar", "unknown");
    document.body.appendChild(element);
    await element.updateComplete;

    expect(element.toolbar).toBe("simple");
  });

  it("records pointer movement while overlay is visible", async () => {
    const requestFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation(() => 1);

    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      tracker: { getSnapshot: () => { totalSamples: number } };
    };

    try {
      document.body.appendChild(element);
      await element.updateComplete;

      const button = element.shadowRoot?.querySelector<HTMLButtonElement>("button.toggle");
      const surface = element.shadowRoot?.querySelector<HTMLElement>(".surface");
      expect(button).not.toBeNull();
      expect(surface).not.toBeNull();

      vi.spyOn(surface as HTMLElement, "getBoundingClientRect").mockReturnValue({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 300,
        bottom: 220,
        width: 300,
        height: 220,
        toJSON: () => ({})
      });

      button?.click();
      await element.updateComplete;
      surface?.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 10, clientY: 20 }));

      expect(element.tracker.getSnapshot().totalSamples).toBe(1);
    } finally {
      requestFrame.mockRestore();
      element.remove();
    }
  });

  it("ignores pointer tracking when surface has no measurable area", async () => {
    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      tracker: { getSnapshot: () => { totalSamples: number } };
    };

    document.body.appendChild(element);
    await element.updateComplete;

    const surface = element.shadowRoot?.querySelector<HTMLElement>(".surface");
    expect(surface).not.toBeNull();

    vi.spyOn(surface as HTMLElement, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      toJSON: () => ({})
    });

    surface?.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 40, clientY: 35 }));

    expect(element.tracker.getSnapshot().totalSamples).toBe(0);
  });

  it("clamps tracked coordinates to the surface bounds", async () => {
    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      tracker: { getSnapshot: () => { hotspots: Array<{ x: number; y: number }> } };
    };

    document.body.appendChild(element);
    await element.updateComplete;

    const surface = element.shadowRoot?.querySelector<HTMLElement>(".surface");
    expect(surface).not.toBeNull();

    vi.spyOn(surface as HTMLElement, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 10,
      top: 20,
      right: 210,
      bottom: 120,
      width: 200,
      height: 100,
      toJSON: () => ({})
    });

    surface?.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 400, clientY: 500 }));

    const hotspot = element.tracker.getSnapshot().hotspots[0];
    expect(hotspot.x).toBe(200);
    expect(hotspot.y).toBe(100);
  });

  it("schedules a single draw frame while visible and does not loop when idle", async () => {
    const callbacks: Array<(time: number) => void> = [];
    const requestFrame = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      heatmapVisible: boolean;
      drawFrameId: number | null;
      drawHeatmap: () => void;
      updated: () => void;
    };

    document.body.appendChild(element);
    await element.updateComplete;

    const drawHeatmapSpy = vi.spyOn(element, "drawHeatmap").mockImplementation(() => {});

    element.heatmapVisible = true;
    element.updated();
    const firstFrameId = element.drawFrameId;
    expect(firstFrameId).not.toBeNull();
    expect(requestFrame).toHaveBeenCalledTimes(1);

    element.updated();
    expect(element.drawFrameId).toBe(firstFrameId);
    expect(requestFrame).toHaveBeenCalledTimes(1);

    callbacks[0](16);
    expect(drawHeatmapSpy).toHaveBeenCalledTimes(1);
    expect(element.drawFrameId).toBeNull();
    expect(requestFrame).toHaveBeenCalledTimes(1);

    element.heatmapVisible = false;
    element.updated();
    expect(cancelFrame).not.toHaveBeenCalled();
  });

  it("cancels a pending draw frame when the overlay is hidden", async () => {
    const requestFrame = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 7);
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      heatmapVisible: boolean;
      drawFrameId: number | null;
      updated: () => void;
    };

    document.body.appendChild(element);
    await element.updateComplete;

    element.heatmapVisible = true;
    element.updated();
    expect(element.drawFrameId).toBe(7);

    element.heatmapVisible = false;
    element.updated();

    expect(cancelFrame).toHaveBeenCalledWith(7);
    expect(element.drawFrameId).toBeNull();
    expect(requestFrame).toHaveBeenCalledTimes(1);
  });

  it("stops pending draw and resize observer when disconnected", async () => {
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    const disconnect = vi.fn();

    const element = document.createElement("heat-spot") as HTMLElement & {
      drawFrameId: number | null;
      resizeObserver: { disconnect: () => void } | null;
      disconnectedCallback: () => void;
    };
    document.body.appendChild(element);

    element.drawFrameId = 123;
    element.resizeObserver = { disconnect };
    element.disconnectedCallback();

    expect(cancelFrame).toHaveBeenCalledWith(123);
    expect(element.drawFrameId).toBeNull();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(element.resizeObserver).toBeNull();
  });

  it("returns early when drawHeatmap cannot access required render targets", async () => {
    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      drawHeatmap: () => void;
      renderRoot: ShadowRoot;
    };

    document.body.appendChild(element);
    await element.updateComplete;

    const querySpy = vi.spyOn(element.renderRoot, "querySelector").mockReturnValue(null);

    element.drawHeatmap();
    expect(querySpy).toHaveBeenCalled();
  });

  it("returns early when pointer move cannot find the surface element", async () => {
    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      renderRoot: ShadowRoot;
      onPointerMove: (event: PointerEvent) => void;
      tracker: { getSnapshot: () => { totalSamples: number } };
    };

    document.body.appendChild(element);
    await element.updateComplete;

    vi.spyOn(element.renderRoot, "querySelector").mockImplementation((selector: string) => {
      if (selector === ".surface") {
        return null;
      }
      return element.shadowRoot?.querySelector(selector) ?? null;
    });

    element.onPointerMove({ clientX: 1, clientY: 2 } as PointerEvent);
    expect(element.tracker.getSnapshot().totalSamples).toBe(0);
  });

  it("returns early when drawHeatmap surface dimensions are non-positive", async () => {
    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      drawHeatmap: () => void;
      renderRoot: ShadowRoot;
    };

    document.body.appendChild(element);
    await element.updateComplete;

    const canvas = element.shadowRoot?.querySelector<HTMLCanvasElement>("canvas#heatmap") ?? document.createElement("canvas");
    const surface = element.shadowRoot?.querySelector<HTMLElement>(".surface") as HTMLElement;
    Object.defineProperty(surface, "clientWidth", { configurable: true, value: 0 });
    Object.defineProperty(surface, "clientHeight", { configurable: true, value: 0 });

    const querySpy = vi.spyOn(element.renderRoot, "querySelector").mockImplementation((selector: string) => {
      if (selector === "#heatmap") {
        return canvas;
      }
      if (selector === ".surface") {
        return surface;
      }
      return null;
    });

    element.drawHeatmap();
    expect(querySpy).toHaveBeenCalled();
  });

  it("returns early when canvas context is unavailable", async () => {
    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      drawHeatmap: () => void;
      renderRoot: ShadowRoot;
    };

    document.body.appendChild(element);
    await element.updateComplete;

    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getContext").mockReturnValue(null);
    const surface = document.createElement("div");
    Object.defineProperty(surface, "clientWidth", { configurable: true, value: 140 });
    Object.defineProperty(surface, "clientHeight", { configurable: true, value: 80 });

    vi.spyOn(element.renderRoot, "querySelector").mockImplementation((selector: string) => {
      if (selector === "#heatmap") {
        return canvas;
      }
      if (selector === ".surface") {
        return surface;
      }
      return null;
    });

    element.drawHeatmap();
    expect(canvas.width).toBe(140);
    expect(canvas.height).toBe(80);
  });

  it("renders heatmap overlay when surface and context are available", async () => {
    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      drawHeatmap: () => void;
      renderRoot: ShadowRoot;
    };

    document.body.appendChild(element);
    await element.updateComplete;

    const canvas = document.createElement("canvas");
    const context = { fillRect: vi.fn() } as unknown as CanvasRenderingContext2D;
    vi.spyOn(canvas, "getContext").mockReturnValue(context);

    const surface = document.createElement("div");
    Object.defineProperty(surface, "clientWidth", { configurable: true, value: 120 });
    Object.defineProperty(surface, "clientHeight", { configurable: true, value: 90 });

    vi.spyOn(element.renderRoot, "querySelector").mockImplementation((selector: string) => {
      if (selector === "#heatmap") {
        return canvas;
      }
      if (selector === ".surface") {
        return surface;
      }
      return null;
    });

    const renderSpy = vi.spyOn(renderer, "renderHeatmapOverlay").mockImplementation(() => {});

    element.drawHeatmap();

    expect(canvas.width).toBe(120);
    expect(canvas.height).toBe(90);
    expect(renderSpy).toHaveBeenCalledWith(context, 120, 90, expect.any(Array));
  });

  it("records a weighted sample on primary pointerdown", async () => {
    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      tracker: { getSnapshot: () => { totalSamples: number; hotspots: Array<{ count: number; x: number; y: number }> } };
    };

    document.body.appendChild(element);
    await element.updateComplete;

    const surface = element.shadowRoot?.querySelector<HTMLElement>(".surface");
    expect(surface).not.toBeNull();

    vi.spyOn(surface as HTMLElement, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 300,
      bottom: 220,
      width: 300,
      height: 220,
      toJSON: () => ({})
    });

    surface?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 40, clientY: 35 }));

    const snapshot = element.tracker.getSnapshot();
    expect(snapshot.totalSamples).toBe(3);
    expect(snapshot.hotspots[0].count).toBe(3);
    expect(snapshot.hotspots[0].x).toBeCloseTo(40);
    expect(snapshot.hotspots[0].y).toBeCloseTo(35);
  });

  it("ignores non-primary pointerdown samples", async () => {
    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      tracker: { getSnapshot: () => { totalSamples: number } };
    };

    document.body.appendChild(element);
    await element.updateComplete;

    const surface = element.shadowRoot?.querySelector<HTMLElement>(".surface");
    expect(surface).not.toBeNull();

    vi.spyOn(surface as HTMLElement, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 300,
      bottom: 220,
      width: 300,
      height: 220,
      toJSON: () => ({})
    });

    surface?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 2, clientX: 40, clientY: 35 }));

    expect(element.tracker.getSnapshot().totalSamples).toBe(0);
  });

  it("remaps stored hotspots when the surface is resized", async () => {
    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      getHeatmapData: () => {
        viewport: { width: number; height: number };
        hotspots: Array<{ x: number; y: number }>;
      };
      onSurfaceResize: () => void;
    };

    document.body.appendChild(element);
    await element.updateComplete;

    const surface = element.shadowRoot?.querySelector<HTMLElement>(".surface");
    expect(surface).not.toBeNull();

    const rect = {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 200,
      bottom: 100,
      width: 200,
      height: 100,
      toJSON: () => ({})
    };
    const rectSpy = vi.spyOn(surface as HTMLElement, "getBoundingClientRect").mockReturnValue(rect);

    surface?.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 50, clientY: 25 }));

    rect.width = 400;
    rect.height = 200;
    rect.right = 400;
    rect.bottom = 200;
    rectSpy.mockReturnValue(rect);

    element.onSurfaceResize();

    const snapshot = element.getHeatmapData();
    expect(snapshot.viewport).toEqual({ width: 400, height: 200 });
    expect(snapshot.hotspots[0].x).toBeCloseTo(100);
    expect(snapshot.hotspots[0].y).toBeCloseTo(50);
  });

  it("skips resize updates when the surface is missing or empty", async () => {
    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      renderRoot: ShadowRoot;
      onSurfaceResize: () => void;
      tracker: { getSnapshot: () => { viewport: { width: number; height: number } } };
    };

    document.body.appendChild(element);
    await element.updateComplete;

    const querySpy = vi.spyOn(element.renderRoot, "querySelector").mockReturnValue(null);
    element.onSurfaceResize();
    querySpy.mockRestore();

    const surface = element.shadowRoot?.querySelector<HTMLElement>(".surface") as HTMLElement;
    vi.spyOn(surface, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      toJSON: () => ({})
    });

    element.onSurfaceResize();
    expect(element.tracker.getSnapshot().viewport).toEqual({ width: 0, height: 0 });
  });

  it("does not reschedule draw after the pending frame is cancelled", async () => {
    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      heatmapVisible: boolean;
      drawFrameId: number | null;
      cancelScheduledDraw: () => void;
      scheduleDraw: () => void;
    };

    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    document.body.appendChild(element);
    await element.updateComplete;

    element.cancelScheduledDraw();
    expect(cancelFrame).not.toHaveBeenCalled();

    element.heatmapVisible = false;
    element.scheduleDraw();
    expect(element.drawFrameId).toBeNull();
  });

  it("attaches a ResizeObserver and invokes resize handling from its callback", async () => {
    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      resizeObserver: { disconnect: () => void; observe: (target: Element) => void } | null;
      ensureResizeObserver: () => void;
      onSurfaceResize: () => void;
    };

    document.body.appendChild(element);
    await element.updateComplete;

    element.resizeObserver?.disconnect();
    element.resizeObserver = null;

    let observerCb: () => void = () => undefined;
    const observe = vi.fn();
    const OriginalRO = globalThis.ResizeObserver;

    class FakeResizeObserver {
      constructor(callback: () => void) {
        observerCb = callback;
      }

      observe = observe;
      disconnect = vi.fn();
      unobserve = vi.fn();
    }

    vi.stubGlobal("ResizeObserver", FakeResizeObserver);

    try {
      element.ensureResizeObserver();
      expect(observe).toHaveBeenCalled();
      expect(element.resizeObserver).not.toBeNull();

      const resizeSpy = vi.spyOn(element, "onSurfaceResize").mockImplementation(() => {});
      observerCb();
      expect(resizeSpy).toHaveBeenCalledTimes(1);

      const existing = element.resizeObserver;
      element.ensureResizeObserver();
      expect(element.resizeObserver).toBe(existing);
    } finally {
      vi.stubGlobal("ResizeObserver", OriginalRO);
    }
  });

  it("skips ResizeObserver setup when the API is unavailable or the surface is missing", async () => {
    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      resizeObserver: { disconnect: () => void } | null;
      ensureResizeObserver: () => void;
      renderRoot: ShadowRoot;
    };

    document.body.appendChild(element);
    await element.updateComplete;

    const original = globalThis.ResizeObserver;
    element.resizeObserver = null;
    vi.stubGlobal("ResizeObserver", undefined);

    try {
      element.ensureResizeObserver();
      expect(element.resizeObserver).toBeNull();
    } finally {
      vi.stubGlobal("ResizeObserver", original);
    }

    element.resizeObserver = null;
    vi.spyOn(element.renderRoot, "querySelector").mockReturnValue(null);
    element.ensureResizeObserver();
    expect(element.resizeObserver).toBeNull();
  });

  it("skips drawing when a scheduled frame is no longer dirty or visible", async () => {
    const frames: Array<(time: number) => void> = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });

    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      heatmapVisible: boolean;
      needsDraw: boolean;
      scheduleDraw: () => void;
      drawHeatmap: () => void;
    };

    document.body.appendChild(element);
    await element.updateComplete;

    const drawSpy = vi.spyOn(element, "drawHeatmap").mockImplementation(() => {});

    element.heatmapVisible = true;
    element.needsDraw = false;
    element.scheduleDraw();
    frames.at(-1)?.(16);
    expect(drawSpy).not.toHaveBeenCalled();

    element.heatmapVisible = true;
    element.needsDraw = true;
    element.scheduleDraw();
    element.heatmapVisible = false;
    frames.at(-1)?.(16);
    expect(drawSpy).not.toHaveBeenCalled();
  });

  it("does not reconnect a resize observer after the element is disconnected", async () => {
    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      resizeObserver: { disconnect: () => void } | null;
    };

    document.body.appendChild(element);
    const pending = element.updateComplete;
    element.remove();
    await pending;
    expect(element.resizeObserver).toBeNull();
  });
});
