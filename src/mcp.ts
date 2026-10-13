import { McpServer, type StandardSchemaWithJSON } from "@modelcontextprotocol/server";

import {
  normalizeRenderInput,
  renderInputSchema,
  type RenderInput,
} from "./contracts";
import { buildToolDescription } from "./prompts";
import { WIDGET_URI, widgetResource } from "./widget";

const NO_AUTH_SECURITY = [{ type: "noauth" }];
const sdkInputSchema = renderInputSchema as unknown as StandardSchemaWithJSON<
  RenderInput,
  RenderInput
>;

export function createThinkingServer(): McpServer {
  const server = new McpServer({
    name: "kira-heart-window-mcp",
    version: "1.1.0",
  });

  server.registerTool<StandardSchemaWithJSON, typeof sdkInputSchema>(
    "render_think_block",
    {
      title: "渲染心绪侧窗",
      description: buildToolDescription(),
      inputSchema: sdkInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      _meta: {
        securitySchemes: NO_AUTH_SECURITY,
        "openai/outputTemplate": WIDGET_URI,
        "openai/toolInvocation/invoking": "展开纸边心绪",
        "openai/toolInvocation/invoked": "心绪已展开",
      },
    },
    async (rawInput) => {
      const viewModel = normalizeRenderInput(rawInput);
      const meta: Record<string, unknown> = {
        content: viewModel.content,
        mode: viewModel.mode,
        effort: viewModel.effort,
        skin: viewModel.skin,
        expanded: viewModel.expanded,
      };
      return {
        content: [
          {
            type: "text" as const,
            text: viewModel.mode === "deep_think" ? "思路已展开" : "心绪已展开",
          },
        ],
        _meta: meta,
      };
    },
  );

  const resource = widgetResource();
  server.registerResource(
    resource.name,
    resource.uri,
    {
      title: resource.title,
      description: resource.description,
      mimeType: resource.mimeType,
    },
    async () => ({
      contents: [
        {
          uri: resource.uri,
          mimeType: resource.mimeType,
          text: resource.text,
          _meta: resource._meta,
        },
      ],
    }),
  );

  return server;
}
