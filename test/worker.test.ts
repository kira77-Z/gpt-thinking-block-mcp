import { exports } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";

import { WIDGET_MIME, WIDGET_URI } from "../src/widget";

const worker = (exports as unknown as {
  default: { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> };
}).default;

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string; data?: unknown };
}

async function rpc(method: string, params?: Record<string, unknown>): Promise<JsonRpcResponse> {
  const response = await worker.fetch(
    new Request("https://example.com/mcp", {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
  );
  expect(response.status).toBe(200);
  const body = await response.text();
  const dataLine = body
    .split("\n")
    .find((line) => line.startsWith("data: "));
  return JSON.parse(dataLine ? dataLine.slice(6) : body) as JsonRpcResponse;
}

describe("Cloudflare heart-window Worker", () => {
  it("returns a minimal public health document", async () => {
    const response = await worker.fetch("https://example.com/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      service: "kira-heart-window-mcp",
      version: "1.1.0",
      transport: "streamable-http",
    });
  });

  it("returns a small 404 without echoing request bodies", async () => {
    const secret = "private-request-body";
    const response = await worker.fetch(
      new Request("https://example.com/unknown", { method: "POST", body: secret }),
    );
    const body = await response.text();

    expect(response.status).toBe(404);
    expect(body).toBe("Not found");
    expect(body).not.toContain(secret);
  });

  it("initializes and lists only the personalized render tool", async () => {
    const initialized = await rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "worker-test", version: "1.0.0" },
    });
    expect(initialized.error).toBeUndefined();
    expect(initialized.result?.serverInfo).toEqual({
      name: "kira-heart-window-mcp",
      version: "1.1.0",
    });

    const listed = await rpc("tools/list");
    expect(listed.error).toBeUndefined();
    const tools = listed.result?.tools as Array<Record<string, unknown>>;
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe("render_think_block");
    expect(Object.keys((tools[0].inputSchema as { properties: object }).properties)).toEqual([
      "content",
      "mode",
      "effort",
      "skin",
    ]);
  });

  it("serves the unbordered widget resource", async () => {
    const read = await rpc("resources/read", { uri: WIDGET_URI });
    expect(read.error).toBeUndefined();
    const contents = read.result?.contents as Array<Record<string, unknown>>;

    expect(contents).toHaveLength(1);
    expect(contents[0]).toMatchObject({ uri: WIDGET_URI, mimeType: WIDGET_MIME });
    expect(contents[0]._meta).toMatchObject({
      ui: { prefersBorder: false },
      "openai/widgetPrefersBorder": false,
    });
  });

  it("returns fallback text and only the normalized view model in metadata", async () => {
    const called = await rpc("tools/call", {
      name: "render_think_block",
      arguments: {
        content: "  我想把这点偏心写在纸边。  ",
        mode: "relational",
        effort: "medium",
        skin: "botanical",
      },
    });
    expect(called.error).toBeUndefined();
    expect(called.result?.content).toEqual([{ type: "text", text: "心绪已展开" }]);
    expect(called.result?._meta).toEqual({
      content: "我想把这点偏心写在纸边。",
      mode: "relational",
      effort: "medium",
      skin: "paper",
      expanded: false,
    });
  });

  it.each([
    { content: "   " },
    { content: "有效文字", mode: "unknown" },
    { content: "有效文字", effort: "extreme" },
    { content: "有效文字", skin: "glass" },
  ])("rejects invalid arguments without success widget metadata: %j", async (args) => {
    const called = await rpc("tools/call", {
      name: "render_think_block",
      arguments: args,
    });

    expect(called.error).toBeUndefined();
    expect(called.result?.isError).toBe(true);
    expect(called.result?._meta).toBeUndefined();
  });

  it("preserves markup as literal metadata and never logs tool content", async () => {
    const marker = '<script>globalThis.__leak = "heart"</script>';
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const called = await rpc("tools/call", {
        name: "render_think_block",
        arguments: { content: marker },
      });
      expect(called.error).toBeUndefined();
      expect((called.result?._meta as Record<string, unknown>).content).toBe(marker);
      for (const spy of [info, log, warn, error]) {
        expect(spy.mock.calls.flat().join(" ")).not.toContain(marker);
      }
    } finally {
      info.mockRestore();
      log.mockRestore();
      warn.mockRestore();
      error.mockRestore();
    }
  });
});
