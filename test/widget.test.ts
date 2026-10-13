import { describe, expect, it } from "vitest";

import {
  WIDGET_HTML,
  WIDGET_MIME,
  WIDGET_URI,
  widgetResource,
} from "../src/widget";

describe("paper-margin widget", () => {
  it("uses a stable MCP Apps resource identity", () => {
    expect(WIDGET_URI).toBe("ui://widget/kira-heart-window-v1.html");
    expect(WIDGET_MIME).toBe("text/html;profile=mcp-app");
  });

  it("reads Apps bridge data without injecting dynamic HTML", () => {
    expect(WIDGET_HTML).toContain("window.openai");
    expect(WIDGET_HTML).toContain("openai:set_globals");
    expect(WIDGET_HTML).toContain("textContent");
    expect(WIDGET_HTML).not.toMatch(/\.innerHTML\s*=/u);
  });

  it("contains one accessible disclosure control and content targets", () => {
    expect(WIDGET_HTML.match(/<button\b/gu)).toHaveLength(1);
    expect(WIDGET_HTML).toContain('id="toggle"');
    expect(WIDGET_HTML).toContain('aria-expanded="true"');
    expect(WIDGET_HTML).toContain('id="title"');
    expect(WIDGET_HTML).toContain('id="heart-content"');
    expect(WIDGET_HTML).toContain('id="narration"');
  });

  it("supports host themes, narrow widths, and reduced motion", () => {
    expect(WIDGET_HTML).toContain("prefers-color-scheme");
    expect(WIDGET_HTML).toContain(':root:not([data-theme="light"])');
    expect(WIDGET_HTML).toContain("prefers-reduced-motion");
    expect(WIDGET_HTML).toContain("overflow-wrap");
    expect(WIDGET_HTML).toContain("max-width: 100%");
    expect(WIDGET_HTML).toContain('data-theme');
  });

  it("keeps the presentation quieter than the original cards", () => {
    expect(WIDGET_HTML).toContain("border-left");
    expect(WIDGET_HTML).not.toContain("STYLE ·");
    expect(WIDGET_HTML).not.toContain("EFFORT ·");
    expect(WIDGET_HTML).not.toContain("botanical");
    expect(WIDGET_HTML).not.toContain("microglow");
    expect(WIDGET_HTML).not.toContain("box-shadow");
  });

  it("requests an unbordered host surface", () => {
    const resource = widgetResource();
    expect(resource).toMatchObject({
      uri: WIDGET_URI,
      mimeType: WIDGET_MIME,
      _meta: {
        ui: { prefersBorder: false },
        "openai/widgetPrefersBorder": false,
      },
    });
  });
});
