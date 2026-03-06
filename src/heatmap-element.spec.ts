/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";

import "./heatmap-element.js";

describe("heat-map component", () => {
  it("toggles overlay visibility with icon button", async () => {
    const requestFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation(() => {
        return 1;
      });
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    try {
      const element = document.createElement("heat-map") as HTMLElement & {
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
    const element = document.createElement("heat-map") as HTMLElement & {
      updateComplete: Promise<unknown>;
    };

    element.setAttribute("toolbar", "hidden");
    document.body.appendChild(element);
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector("button.toggle")).toBeNull();
    element.remove();
  });

  it("records pointer movement while hidden", async () => {
    const element = document.createElement("heat-map") as HTMLElement & {
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
});
