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

  it("does not record pointer samples while overlay is visible", async () => {
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

      button?.click();
      await element.updateComplete;
      surface?.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 10, clientY: 20 }));

      expect(element.tracker.getSnapshot().totalSamples).toBe(0);
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

  it("starts the draw loop only once while visible and cancels it when hidden", async () => {
    let currentFrame = 0;
    const requestFrame = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      currentFrame += 1;
      if (currentFrame === 1) {
        callback(16);
      }
      return currentFrame;
    });
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    const element = document.createElement("heat-spot") as HTMLElement & {
      updateComplete: Promise<unknown>;
      heatmapVisible: boolean;
      drawLoopId: number | null;
      drawHeatmap: () => void;
      updated: () => void;
    };

    document.body.appendChild(element);
    await element.updateComplete;

    const drawHeatmapSpy = vi.spyOn(element, "drawHeatmap").mockImplementation(() => {});

    element.heatmapVisible = true;
    element.updated();
    const firstLoopId = element.drawLoopId;
    expect(firstLoopId).not.toBeNull();

    element.updated();
    expect(element.drawLoopId).toBe(firstLoopId);

    element.heatmapVisible = false;
    element.updated();

    expect(cancelFrame).toHaveBeenCalledTimes(1);
    expect(drawHeatmapSpy).toHaveBeenCalled();
    expect(requestFrame).toHaveBeenCalled();
  });

  it("stops draw loop when disconnected", async () => {
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    const element = document.createElement("heat-spot") as HTMLElement & {
      drawLoopId: number | null;
      disconnectedCallback: () => void;
    };
    document.body.appendChild(element);

    element.drawLoopId = 123;
    element.disconnectedCallback();

    expect(cancelFrame).toHaveBeenCalledWith(123);
    expect(element.drawLoopId).toBeNull();
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
});
