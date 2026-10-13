# Deploy the Kira Heart Window to Cloudflare

This guide covers the personalized TypeScript Worker. It serves:

- `GET /health`
- Streamable HTTP MCP at `/mcp`
- the `render_think_block` tool and its paper-margin MCP Apps resource

It needs no credit card, Railway, Render, Durable Object, KV, database, environment variable, or persistent storage. Tool content is processed in memory and is not logged by application code. The displayed note is prepared public narration, not hidden chain-of-thought.

## Option A: GitHub-connected Workers Builds (phone/browser friendly)

1. Fork this repository to your GitHub account.
2. In the Cloudflare dashboard, open **Workers & Pages**, choose **Create**, then choose the option to import a Git repository.
3. Select your fork and its `main` branch.
4. Use `npm run deploy` as the deploy command. No build command, environment variable, database, or storage binding is required.
5. Save and deploy. Keep the generated HTTPS hostname, such as `https://kira-heart-window-mcp.<account>.workers.dev`.

Cloudflare may change dashboard labels over time, but the repository, branch, and deploy command above are the important fields.

## Option B: local CLI

```bash
npm install
npm test -- --run
npx wrangler login
npm run deploy
```

For local development:

```bash
npm run dev
```

## Verify the deployment

Health check:

```bash
curl https://YOUR-WORKER.workers.dev/health
```

Expected fields are `status`, `service`, `version`, and `transport`. The health response intentionally contains no prompt, content, or configuration text.

Open MCP Inspector and connect its Streamable HTTP transport to:

```text
https://YOUR-WORKER.workers.dev/mcp
```

Verify `initialize`, `tools/list`, `resources/read`, and one `render_think_block` call. The tool uses `content`, `mode`, `effort`, and `skin`; defaults are `relational + low + paper`.

## Connect ChatGPT

In ChatGPT developer mode, add a custom MCP connector using the full HTTPS URL:

```text
https://YOUR-WORKER.workers.dev/mcp
```

No authentication is configured in this personal version. Treat the URL as public and never place secrets in a heart note. If you change the schema, tool description, or widget URI, redeploy, then remove/re-add or refresh the connector so ChatGPT reloads the tool and resource metadata.

Use the personalized prompt from [`examples/prompts.md`](../examples/prompts.md). It calls at most once per assistant turn and forces `relational + low` after four substantive replies without a block.

## Roll back

In Cloudflare, open the Worker's **Deployments** list, select the last known-good deployment, and choose **Rollback**. A Git revert followed by a new deployment is the source-controlled alternative.

## Original Python server

The Worker uses `render_think_block`, `paper`, and `ink`. The existing Python/Docker server remains separate and continues to use `render_thinking_block`, `botanical`, and `microglow`.
