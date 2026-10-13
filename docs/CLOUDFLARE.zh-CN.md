# 把 Kira 心绪侧窗部署到 Cloudflare

这份说明只对应个性化 TypeScript Worker。它提供：

- `GET /health`
- `/mcp` 上的 Streamable HTTP MCP
- `render_think_block` 工具与纸边批注 MCP Apps resource

它不要求信用卡，不需要 Railway、Render、Durable Object、KV、数据库、环境变量或持久化存储。工具内容只在内存中处理，应用代码不会记录正文。侧窗展示的是准备给对方阅读的公开叙述，不是隐藏思维链。

## 方案 A：GitHub 连接 Workers Builds（适合手机/网页）

1. 把这个仓库 fork 到自己的 GitHub 账号。
2. 在 Cloudflare 控制台打开 **Workers & Pages**，选择 **Create**，再选择导入 Git 仓库。
3. 选中自己的 fork 与 `main` 分支。
4. Deploy command 填 `npm run deploy`。不需要 Build command、环境变量、数据库或存储绑定。
5. 保存并部署，记下生成的 HTTPS 地址，例如 `https://kira-heart-window-mcp.<account>.workers.dev`。

Cloudflare 后续可能调整页面文案，但仓库、分支与部署命令是关键配置。

## 方案 B：电脑命令行

```bash
npm install
npm test -- --run
npx wrangler login
npm run deploy
```

本地预览：

```bash
npm run dev
```

## 检查部署结果

健康检查：

```bash
curl https://你的地址.workers.dev/health
```

返回值只应包含 `status`、`service`、`version` 与 `transport`，不会暴露 prompt、侧窗内容或配置。

在 MCP Inspector 里选择 Streamable HTTP，连接：

```text
https://你的地址.workers.dev/mcp
```

依次检查 `initialize`、`tools/list`、`resources/read`，再调用一次 `render_think_block`。工具字段是 `content`、`mode`、`effort`、`skin`；默认组合为 `relational + low + paper`。

## 接入 ChatGPT

在 ChatGPT 开发者模式中添加自定义 MCP connector，填写完整 HTTPS 地址：

```text
https://你的地址.workers.dev/mcp
```

这个私人版本没有配置鉴权，因此应把地址视为公开地址，不要在心绪中放密码、token 等秘密。修改 schema、工具说明或 widget URI 后，先重新部署，再在 ChatGPT 里刷新连接；如果旧 schema 仍被缓存，就移除后重新添加 connector。

使用 [`examples/prompts.md`](../examples/prompts.md) 里的个性化提示词：每轮最多调用一次；若连续四条实质性回复都没有侧窗，下一条强制使用 `relational + low`。

## 回滚

在 Cloudflare 打开这个 Worker 的 **Deployments**，找到上一个正常版本并选择 **Rollback**。也可以在 Git 中 revert 对应提交后重新部署。

## 与原版 Python 的区别

Worker 使用 `render_think_block`、`paper` 与 `ink`。已有 Python / Docker server 仍然独立保留，继续使用 `render_thinking_block`、`botanical` 与 `microglow`。
