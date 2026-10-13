export const WIDGET_URI = "ui://widget/kira-heart-window-v2.html";
export const WIDGET_MIME = "text/html;profile=mcp-app";

export const WIDGET_HTML = String.raw`<!doctype html>
<html lang="zh-CN" data-mode="relational" data-effort="low" data-skin="paper">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Kira 心绪侧窗</title>
  <style>
    :root {
      color-scheme: light dark;
      --accent: #6b7075;
      --title: #6b7075;
      --ink: #453a3e;
      --muted: #85767b;
    }
    :root[data-skin="ink"] {
      --accent: #6b7075;
      --title: #6b7075;
    }
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --accent: #aeb4ba;
        --title: #aeb4ba;
        --ink: #f1e8eb;
        --muted: #bbaab0;
      }
      :root:not([data-theme="light"])[data-skin="ink"] {
        --accent: #aeb4ba;
        --title: #aeb4ba;
      }
    }
    :root[data-theme="dark"] {
      --accent: #aeb4ba;
      --title: #aeb4ba;
      --ink: #f1e8eb;
      --muted: #bbaab0;
    }
    :root[data-theme="dark"][data-skin="ink"] {
      --accent: #aeb4ba;
      --title: #aeb4ba;
    }
    * { box-sizing: border-box; }
    html, body {
      width: 100%;
      max-width: 100%;
      margin: 0;
      padding: 0;
      overflow-x: hidden;
      background: transparent;
    }
    body {
      color: var(--ink);
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
    }
    .margin-note {
      width: 100%;
      max-width: 100%;
      margin: 2px 0;
      padding: 4px 8px 4px 15px;
      border-left: 2px solid var(--accent);
      background: transparent;
    }
    .toggle {
      display: flex;
      width: 100%;
      min-height: 28px;
      align-items: center;
      gap: 8px;
      margin: 0;
      padding: 0;
      border: 0;
      color: var(--title);
      background: transparent;
      font: 600 12px/1.5 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
      letter-spacing: .16em;
      text-align: left;
      cursor: pointer;
    }
    .title { flex: 1; }
    .chevron {
      width: 7px;
      height: 7px;
      margin-right: 4px;
      border-right: 1.5px solid currentColor;
      border-bottom: 1.5px solid currentColor;
      transform: rotate(45deg) translateY(-2px);
      transform-origin: center;
      opacity: .72;
      transition: transform 150ms ease;
    }
    .content {
      display: grid;
      grid-template-rows: 1fr;
      opacity: 1;
      transition: grid-template-rows 180ms ease, opacity 130ms ease;
    }
    .content-inner { min-height: 0; overflow: hidden; }
    .narration {
      margin: 5px 0 3px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      color: var(--ink);
      font: 15px/1.82 Georgia, "Songti SC", "Noto Serif CJK SC", serif;
      letter-spacing: .008em;
    }
    .margin-note[data-collapsed="true"] .content {
      grid-template-rows: 0fr;
      opacity: 0;
    }
    .margin-note[data-collapsed="true"] .chevron {
      transform: rotate(-45deg);
    }
    @media (prefers-reduced-motion: reduce) {
      .chevron, .content { transition: none; }
    }
  </style>
</head>
<body>
  <section class="margin-note" id="note" data-collapsed="false" aria-label="心绪侧窗">
    <button class="toggle" id="toggle" type="button" aria-expanded="true" aria-controls="heart-content">
      <span class="title" id="title">此刻</span>
      <span class="chevron" aria-hidden="true"></span>
    </button>
    <div class="content" id="heart-content">
      <div class="content-inner">
        <p class="narration" id="narration"></p>
      </div>
    </div>
  </section>
  <script>
    const note = document.getElementById("note");
    const toggle = document.getElementById("toggle");
    const title = document.getElementById("title");
    const narration = document.getElementById("narration");
    const validModes = new Set(["relational", "deep_think"]);
    const validEfforts = new Set(["low", "medium", "high"]);
    const validSkins = new Set(["paper", "ink"]);
    let heightFrame = 0;
    let lastMeasuredHeight = -1;

    function requestIntrinsicHeight(force = false) {
      const host = window.openai || {};
      if (typeof host.notifyIntrinsicHeight !== "function") return;
      cancelAnimationFrame(heightFrame);
      heightFrame = requestAnimationFrame(() => {
        const measuredHeight = Math.ceil(document.documentElement.scrollHeight);
        if (!force && measuredHeight === lastMeasuredHeight) return;
        lastMeasuredHeight = measuredHeight;
        try { host.notifyIntrinsicHeight(); } catch (_) {}
      });
    }

    function setCollapsed(collapsed) {
      note.dataset.collapsed = collapsed ? "true" : "false";
      toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
      requestIntrinsicHeight(true);
    }

    toggle.addEventListener("click", () => {
      setCollapsed(note.dataset.collapsed !== "true");
    });

    function currentResult(event) {
      const bridge = window.openai || {};
      const globals = event && event.detail && event.detail.globals;
      const api = Object.assign({}, bridge, globals && typeof globals === "object" ? globals : {});
      const input = api.toolInput || {};
      const output = api.toolOutput || {};
      const responseMeta = api.toolResponseMetadata || {};
      const resultMeta = (responseMeta.mcp_tool_result && responseMeta.mcp_tool_result._meta)
        || (responseMeta.call_tool_result && responseMeta.call_tool_result._meta)
        || responseMeta._meta
        || responseMeta;
      return { api, input, output, resultMeta };
    }

    function render(event) {
      const { api, input, output, resultMeta } = currentResult(event);
      const requestedMode = resultMeta.mode || input.mode || output.mode;
      const requestedEffort = resultMeta.effort || input.effort || output.effort;
      const requestedSkin = resultMeta.skin || input.skin || output.skin;
      const requestedTitle = resultMeta.title || input.title || output.title;
      const mode = validModes.has(requestedMode) ? requestedMode : "relational";
      const effort = validEfforts.has(requestedEffort) ? requestedEffort : "low";
      const skin = validSkins.has(requestedSkin) ? requestedSkin : "paper";
      const content = resultMeta.content || input.content || output.content || "";
      const expanded = typeof resultMeta.expanded === "boolean" ? resultMeta.expanded : effort === "low";

      if (api.theme === "light" || api.theme === "dark") {
        document.documentElement.dataset.theme = api.theme;
      }
      document.documentElement.dataset.mode = mode;
      document.documentElement.dataset.effort = effort;
      document.documentElement.dataset.skin = skin;
      const fallbackTitle = mode === "deep_think" ? "推敲" : "此刻";
      title.textContent = typeof requestedTitle === "string" && requestedTitle.trim()
        ? requestedTitle
        : fallbackTitle;
      narration.textContent = String(content);
      setCollapsed(!expanded);
      requestIntrinsicHeight(true);
    }

    window.addEventListener("openai:set_globals", render);
    if (typeof ResizeObserver === "function") {
      new ResizeObserver(() => requestIntrinsicHeight()).observe(document.body);
    }
    render();
  </script>
</body>
</html>`;

export function widgetResource(): {
  uri: string;
  name: string;
  title: string;
  description: string;
  mimeType: string;
  text: string;
  _meta: Record<string, unknown>;
} {
  return {
    uri: WIDGET_URI,
    name: "kira-heart-window",
    title: "Kira 心绪侧窗",
    description: "以轻量纸边批注显示本轮公开心绪或关键思路。",
    mimeType: WIDGET_MIME,
    text: WIDGET_HTML,
    _meta: {
      ui: { prefersBorder: false },
      "openai/widgetPrefersBorder": false,
      "openai/widgetDescription": "一条不打断正文的可折叠心绪批注。",
    },
  };
}
