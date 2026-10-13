import { createMcpHandler } from "agents/mcp/server";

import { createThinkingServer } from "./mcp";

const mcpHandler = createMcpHandler(createThinkingServer, {
  route: "/mcp",
  corsOptions: false,
});

const HEALTH = Object.freeze({
  status: "ok",
  service: "kira-heart-window-mcp",
  version: "1.1.0",
  transport: "streamable-http",
});

export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json(HEALTH);
    }

    if (url.pathname === "/mcp") {
      return mcpHandler(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
};
