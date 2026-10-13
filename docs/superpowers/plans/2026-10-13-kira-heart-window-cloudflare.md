# Kira Heart Window Cloudflare Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a free-deployable Cloudflare Workers Remote MCP implementation that renders Kira's compact “paper-margin” heart window in ChatGPT.

**Architecture:** Keep the current Python/Docker server untouched and add an independent TypeScript Worker. A stateless MCP SDK v2 factory exposes one render tool and one static MCP Apps resource; pure modules own validation, public-narration prompts, and widget markup so they can be tested separately. The Worker adds only `/mcp` and `/health`, stores no content, and falls back to the documented legacy handler only if ChatGPT integration proves SDK v2 incompatible.

**Tech Stack:** TypeScript, Cloudflare Workers, `agents`, `@modelcontextprotocol/server@2.0.0`, Zod, Vitest with Cloudflare Workers pool, static MCP Apps HTML/CSS/JavaScript.

**Spec:** `docs/superpowers/specs/2026-10-13-kira-heart-window-cloudflare-design.md`

## Global Constraints

- Do not modify the behavior of `server.py`, `Dockerfile`, `docker-compose.yml`, or the existing Python tests.
- Public MCP transport is stateless Streamable HTTP at `/mcp`; health is JSON at `/health`.
- Use `createMcpHandler` from `agents/mcp/server`; do not use `McpAgent`, Durable Objects, KV, databases, or analytics.
- Pin `@modelcontextprotocol/server` to `2.0.0`; use current compatible `agents`, `zod`, `wrangler`, TypeScript, and Vitest versions recorded by the lockfile.
- Worker tool name is `render_think_block`; the Python tool remains `render_thinking_block`.
- Modes are `relational` and `deep_think`; efforts are `low`, `medium`, and `high`; skins are `paper` and `ink`.
- Accept legacy skin aliases `botanical -> paper` and `microglow -> ink`.
- Defaults are `relational + low + paper`; maximum one widget per assistant turn is a prompt-level rule.
- Length bands are low 30–80 Chinese characters, medium 80–180, high 180–350; the upper bound is server-enforced and the lower bound is not padded.
- Low starts expanded; medium and high start collapsed.
- Never persist or log `content`; `/health` exposes only status, service name, version, and transport.
- Widget content must enter the DOM through `textContent`, never `innerHTML` or string interpolation into executable markup.
- Keep the widget visually inline: no large background card, heavy border, shadow, top bar, or English badges.

## Review Focus

- A `content` value containing `<script>`, quotes, emoji, and line breaks must display literally and execute nothing; pinned in Task 1 and Task 3.
- A low/medium/high string that crosses its cap without nearby Chinese punctuation must end with one ellipsis and stay within 80/180/350 characters; pinned in Task 1.
- Missing optional fields and legacy skin aliases must normalize predictably, while unknown enums and blank content return schema errors; pinned in Task 1 and Task 4.
- ChatGPT light/dark theme changes and a 320px host width must not hide text or create horizontal scrolling; pinned in Task 3.
- An MCP failure or unsupported route must not expose input content in logs or return a fake success widget; pinned in Task 4.

---

## File Structure

```text
src/
  contracts.ts   # public enums, input normalization, truncation, view model
  prompts.ts     # tool descriptions and prompt-level cadence rules
  widget.ts      # static component URI, MIME type, HTML/CSS/JS
  mcp.ts         # MCP server factory, resource and tool registration
  index.ts       # Worker fetch router for /health and /mcp
test/
  contracts.test.ts
  prompts.test.ts
  widget.test.ts
  worker.test.ts
package.json
package-lock.json
tsconfig.json
vitest.config.ts
wrangler.jsonc
README.md
README.zh-CN.md
examples/prompts.md
```

## Task 1: Worker Harness and Pure Input Contract

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `wrangler.jsonc`
- Create: `src/contracts.ts`
- Create: `test/contracts.test.ts`

**Interfaces:**
- Consumes: none.
- Produces: `Mode`, `Effort`, `Skin`, `RenderInput`, `RenderViewModel`; `normalizeRenderInput(raw: unknown): RenderViewModel`; `truncateAtSentence(text: string, limit: number): string`; `EFFORT_LIMITS`.

- [ ] **Step 1: Add the TypeScript/Worker test harness and write failing contract tests**

Create `test/contracts.test.ts` with named cases asserting:

```ts
expect(normalizeRenderInput({ content: "想靠近她。" })).toMatchObject({
  mode: "relational", effort: "low", skin: "paper", expanded: true,
});
expect(normalizeRenderInput({ content: "x", skin: "botanical" }).skin).toBe("paper");
expect(normalizeRenderInput({ content: "x", skin: "microglow" }).skin).toBe("ink");
expect(() => normalizeRenderInput({ content: "   " })).toThrow();
expect(() => normalizeRenderInput({ content: "x", mode: "unknown" })).toThrow();
```

Add table tests for limits `low=80`, `medium=180`, `high=350`, sentence-boundary truncation, no-punctuation truncation, emoji, newlines, and literal `<script>alert(1)</script>` preservation as plain data.

- [ ] **Step 2: Run the contract test and verify it fails**

Run: `npm test -- --run test/contracts.test.ts`  
Expected: FAIL because `src/contracts.ts` does not exist.

- [ ] **Step 3: Implement the public contract in `src/contracts.ts`**

Implement these exact exports:

```ts
export type Mode = "relational" | "deep_think";
export type Effort = "low" | "medium" | "high";
export type Skin = "paper" | "ink";
export interface RenderInput { content: string; mode?: Mode; effort?: Effort; skin?: Skin | "botanical" | "microglow"; }
export interface RenderViewModel { content: string; mode: Mode; effort: Effort; skin: Skin; expanded: boolean; }
export const EFFORT_LIMITS: Readonly<Record<Effort, number>>;
export function truncateAtSentence(text: string, limit: number): string;
export function normalizeRenderInput(raw: unknown): RenderViewModel;
```

Use Zod for runtime validation. Trim outer whitespace, map aliases before producing `Skin`, set `expanded` only for `low`, and count JavaScript Unicode code points with `Array.from` so surrogate-pair emoji are not split.

- [ ] **Step 4: Run contract tests and type checking**

Run: `npm test -- --run test/contracts.test.ts && npm run typecheck`  
Expected: all contract tests PASS and TypeScript exits 0.

- [ ] **Step 5: Commit the contract foundation**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts wrangler.jsonc src/contracts.ts test/contracts.test.ts
git commit -m "feat: add worker input contract"
```

## Task 2: Public Narration Prompts and Cadence Copy

**Files:**
- Create: `src/prompts.ts`
- Create: `test/prompts.test.ts`

**Interfaces:**
- Consumes: `Mode`, `Effort`, and `Skin` from `src/contracts.ts`.
- Produces: `TOOL_DESCRIPTION_ZH`, `MODE_DESCRIPTIONS_ZH`, `EFFORT_DESCRIPTIONS_ZH`, `SKIN_DESCRIPTION_ZH`, and `buildToolDescription(): string`.

- [ ] **Step 1: Write failing prompt-policy tests**

Create `test/prompts.test.ts` asserting the generated tool description:

- calls the content a directly readable first-person “心绪/思路”, not private scratchpad;
- contains the four-substantive-reply fallback;
- excludes the old claims `用户看不到` and `private scratchpad`;
- tells `relational` not to repeat the user, plan the answer, or mention AI/model/system/prompt/tool;
- tells aligned wishes to use `我想/我喜欢` and disagreements to use `我不同意/我担心`;
- tells `deep_think` to expose only key evidence conflicts and trade-offs;
- states all exact length bands and defaults.

- [ ] **Step 2: Run the prompt test and verify it fails**

Run: `npm test -- --run test/prompts.test.ts`  
Expected: FAIL because `src/prompts.ts` does not exist.

- [ ] **Step 3: Implement the prompt constants and builder**

Implement the exports named above. Keep the tool description in Chinese for this personalized Worker. Encode the six permitted emotional temperatures, the one-primary/one-secondary rule, and the “semantic trigger + four-turn fallback” as model-facing guidance. Do not add English duplicate copy that Kira will not use.

- [ ] **Step 4: Run prompt and contract tests**

Run: `npm test -- --run test/prompts.test.ts test/contracts.test.ts`  
Expected: all tests PASS.

- [ ] **Step 5: Commit prompt policy**

```bash
git add src/prompts.ts test/prompts.test.ts
git commit -m "feat: define public heart-window prompts"
```

## Task 3: Paper-Margin MCP Apps Widget

**Files:**
- Create: `src/widget.ts`
- Create: `test/widget.test.ts`

**Interfaces:**
- Consumes: `RenderViewModel` serialized in tool-result metadata.
- Produces: `WIDGET_URI`, `WIDGET_MIME`, `WIDGET_HTML`, and `widgetResource()`.

- [ ] **Step 1: Write failing static widget tests**

Create `test/widget.test.ts` asserting:

```ts
expect(WIDGET_URI).toBe("ui://widget/kira-heart-window-v1.html");
expect(WIDGET_MIME).toBe("text/html;profile=mcp-app");
expect(WIDGET_HTML).toContain("window.openai");
expect(WIDGET_HTML).toContain("textContent");
expect(WIDGET_HTML).not.toMatch(/\.innerHTML\s*=/);
expect(WIDGET_HTML).toContain("prefers-reduced-motion");
expect(WIDGET_HTML).toContain("prefers-color-scheme");
```

Also assert that the markup contains one semantic disclosure control, a title target, a content target, `overflow-wrap`, and no copies of `STYLE ·`, `EFFORT ·`, `botanical`, or `microglow`.

- [ ] **Step 2: Run the widget test and verify it fails**

Run: `npm test -- --run test/widget.test.ts`  
Expected: FAIL because `src/widget.ts` does not exist.

- [ ] **Step 3: Implement `src/widget.ts`**

Export:

```ts
export const WIDGET_URI = "ui://widget/kira-heart-window-v1.html";
export const WIDGET_MIME = "text/html;profile=mcp-app";
export const WIDGET_HTML: string;
export function widgetResource(): { uri: string; name: string; title: string; description: string; mimeType: string; text: string; _meta: Record<string, unknown> };
```

The HTML must:

- render only a thin vertical rule, `心绪`/`思路`, a restrained chevron, and content;
- read mode, effort, skin, expanded, and content from the current Apps bridge result using the same event/update pattern already proven in `server.py`;
- assign all dynamic strings via `textContent` and fixed enum values via validated `data-*` attributes;
- use a native `<button>` for the disclosure header with `aria-expanded`;
- start low open and medium/high closed from `expanded`;
- use transparent surfaces, CSS custom properties for `paper`/`ink`, a 320px-safe layout, and reduced-motion handling;
- request no outer host border (`ui.prefersBorder=false`, `openai/widgetPrefersBorder=false`).

- [ ] **Step 4: Run widget tests and inspect one standalone fixture**

Run: `npm test -- --run test/widget.test.ts`  
Expected: PASS.

Generate no permanent preview file. Temporarily serve `WIDGET_HTML` through the test harness and inspect 320px, 390px, desktop, light, and dark states; record any visual defects in the task notes before proceeding.

- [ ] **Step 5: Commit the widget**

```bash
git add src/widget.ts test/widget.test.ts
git commit -m "feat: add paper-margin heart widget"
```

## Task 4: Stateless MCP Server and Worker Routes

**Files:**
- Create: `src/mcp.ts`
- Create: `src/index.ts`
- Create: `test/worker.test.ts`
- Modify: `wrangler.jsonc`
- Modify: `vitest.config.ts`

**Interfaces:**
- Consumes: `normalizeRenderInput`, `buildToolDescription`, `widgetResource`, `WIDGET_URI`.
- Produces: `createThinkingServer(): McpServer`; Worker default export `{ fetch(request, env, ctx): Promise<Response> }`.

- [ ] **Step 1: Write failing Worker integration tests**

Using the Cloudflare Vitest pool, create named tests for:

1. `GET /health` returns status 200 and exactly `{ status, service, version, transport }`, with no content or configuration fields.
2. unknown routes return 404 without echoing request bodies.
3. MCP initialize and tools/list expose only `render_think_block` with `content`, `mode`, `effort`, and `skin` schema fields.
4. MCP resources/read returns `WIDGET_URI`, `WIDGET_MIME`, and border preference false.
5. a valid tool call returns plain text fallback plus `_meta` equal to the normalized `RenderViewModel`.
6. blank content and unknown enums produce MCP errors and no success widget metadata.
7. valid `<script>` content remains a literal metadata string and is absent from server logs captured by the test.

- [ ] **Step 2: Run the Worker integration test and verify it fails**

Run: `npm test -- --run test/worker.test.ts`  
Expected: FAIL because `src/mcp.ts` and `src/index.ts` do not exist.

- [ ] **Step 3: Implement `createThinkingServer()` in `src/mcp.ts`**

Use `McpServer` from `@modelcontextprotocol/server`. Register:

- tool `render_think_block` with the Zod input schema and Apps metadata pointing to `WIDGET_URI`;
- resource `WIDGET_URI` returning `widgetResource()`;
- tool annotations `readOnlyHint=true`, `destructiveHint=false`, `idempotentHint=true`, `openWorldHint=false`, and no-auth security metadata.

The tool handler calls `normalizeRenderInput` once and returns:

- a short text fallback such as `心绪已展开` or `思路已展开`;
- `_meta` containing only normalized `content`, `mode`, `effort`, `skin`, and `expanded`;
- no logging of arguments.

- [ ] **Step 4: Implement the Worker router in `src/index.ts`**

Create one `createMcpHandler(createThinkingServer, { route: "/mcp" })` instance. Export an object-style Worker with `fetch()` that:

- handles `GET /health` directly;
- delegates only `/mcp` requests to the MCP handler;
- returns a small 404 response for everything else;
- never catches errors by echoing request bodies or tool arguments.

- [ ] **Step 5: Run integration tests, all unit tests, and type checking**

Run: `npm test -- --run && npm run typecheck`  
Expected: every test PASS and TypeScript exits 0.

- [ ] **Step 6: Start the local Worker and verify endpoints with MCP Inspector**

Run: `npm run dev`  
Expected: Wrangler prints a local HTTPS/HTTP address with `/mcp` available.

In a second terminal run the project's documented MCP Inspector command. Verify initialize, tools/list, resources/read, and one tool call. Confirm `/health` with `curl` and confirm `/think` returns 404 in the Worker version by design.

- [ ] **Step 7: Commit the MCP Worker**

```bash
git add src/mcp.ts src/index.ts test/worker.test.ts wrangler.jsonc vitest.config.ts
git commit -m "feat: serve heart window from cloudflare"
```

## Task 5: Deployment Documentation and Personalized Usage Examples

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `examples/prompts.md`
- Create: `docs/CLOUDFLARE.md`
- Create: `docs/CLOUDFLARE.zh-CN.md`

**Interfaces:**
- Consumes: final Worker scripts, endpoint paths, tool fields, and prompt rules from Tasks 1–4.
- Produces: phone-friendly GitHub/Cloudflare deployment instructions and exact ChatGPT connector guidance.

- [ ] **Step 1: Write a documentation verification checklist before editing**

Record the exact strings that must appear after the edit:

- `npm install`, `npm test`, `npm run dev`, `npm run deploy`;
- `/health`, `/mcp`, and `workers.dev`;
- no card, Railway, Render, Durable Object, KV, or database requirement;
- Worker tool name `render_think_block` and Python tool name `render_thinking_block`;
- `relational + low + paper` default and four-substantive-reply fallback;
- warning that the block is public prepared narration, not hidden chain-of-thought.

- [ ] **Step 2: Update bilingual README summaries without erasing Python deployment**

Add a “Cloudflare Workers” path alongside existing Python/Docker instructions. Explain that `paper/ink` and the new short tool name apply to the Worker implementation, while the old server remains compatible with its original fields and skins.

- [ ] **Step 3: Add focused Cloudflare deployment guides**

Document two supported routes:

1. GitHub-connected Cloudflare Workers Builds for phone/browser deployment: select Kira's fork, use `npm run deploy` as the deploy command, and retain the generated `workers.dev` domain.
2. Local CLI: `npm install`, `npm test`, `npx wrangler login`, `npm run deploy`.

Include health verification, MCP Inspector verification, ChatGPT connector URL format, reconnect-after-schema-change instructions, and rollback to the previous Worker deployment.

- [ ] **Step 4: Replace Worker prompt examples with the approved cadence**

Add one concise example that tells ChatGPT to choose mode/effort by context, call at most once per assistant turn, and force `relational + low` after four substantive replies without a block. Keep the existing Python examples clearly labeled instead of silently changing their tool name.

- [ ] **Step 5: Verify docs against the built project**

Run:

```bash
rg -n "render_think_block|render_thinking_block|workers.dev|four|四条|/mcp|/health" README* docs/CLOUDFLARE* examples/prompts.md
npm test -- --run
```

Expected: all required terms are present in the correct implementation sections and the full test suite PASS.

- [ ] **Step 6: Commit documentation**

```bash
git add README.md README.zh-CN.md examples/prompts.md docs/CLOUDFLARE.md docs/CLOUDFLARE.zh-CN.md
git commit -m "docs: add cloudflare heart-window deployment"
```

## Task 6: Production Deployment and ChatGPT Acceptance

**Files:**
- No source files unless acceptance uncovers a defect; any defect begins with a new failing regression test in the owning task's test file.

**Interfaces:**
- Consumes: the committed Worker implementation and Kira's Cloudflare/GitHub connection.
- Produces: a deployed HTTPS MCP endpoint and completed 12-combination acceptance record.

- [ ] **Step 1: Run the pre-deploy gate**

Run:

```bash
npm ci
npm test -- --run
npm run typecheck
npm run deploy -- --dry-run
git status --short
```

Expected: tests PASS, type checking exits 0, dry run succeeds, and the worktree is clean.

- [ ] **Step 2: Push the implementation branch to Kira's fork**

Push only after Kira explicitly authorizes the external write. Confirm the target remote is `kira77-Z/gpt-thinking-block-mcp` and the intended branch before pushing.

- [ ] **Step 3: Deploy through Cloudflare and verify health**

Connect the fork in Cloudflare Workers Builds or run `npm run deploy`. Record the generated hostname privately, then verify:

```bash
curl -fsS https://<worker>.<account>.workers.dev/health
```

Expected: the exact health schema from Task 4 with status `ok`.

- [ ] **Step 4: Verify the remote server with MCP Inspector**

Confirm tool discovery, resource read, one valid call, one invalid call, and no content-bearing production logs.

- [ ] **Step 5: Connect ChatGPT and execute the visual matrix**

Add `https://<worker>.<account>.workers.dev/mcp` in ChatGPT developer mode. Exercise all 12 combinations:

```text
2 modes × 3 efforts × 2 skins
```

For each, confirm title, line color, initial disclosure state, length cap, text selection, no outer card border, and no horizontal scrolling on the phone.

- [ ] **Step 6: Exercise cadence and failure behavior**

Run at least five substantive conversational turns plus short confirmations and a tool-progress turn. Confirm semantic triggers appear naturally, the fifth eligible turn receives the four-turn fallback, and trivial turns do not consume the cadence. Temporarily disconnect the connector and confirm the normal answer still appears without a fake widget.

- [ ] **Step 7: Apply regression-first fixes if acceptance finds defects**

For each defect: add one failing automated test to the owning test file, run it to see the failure, make the smallest fix, rerun the focused test, then rerun the full suite. Commit each logically independent correction.

- [ ] **Step 8: Final verification**

Run:

```bash
npm test -- --run
npm run typecheck
git status --short --branch
git log --oneline --decorate -8
```

Expected: all tests PASS, no uncommitted files, and the implementation commits are visible in order.

