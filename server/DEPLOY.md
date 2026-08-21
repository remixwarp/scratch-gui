# Cloudflare 部署指南（Pages + Worker）

## 概述

站点有两个需要部署的后端部分：

1. **项目代理 `/api/project-proxy`（Pages Function，推荐方式）**
   位于 `functions/api/project-proxy.js`，随静态站一起自动部署到
   `remixwarp.pages.dev`，**不需要单独的 Worker 或路由配置**。
   这是嵌入项目（`fullscreen.html?project_url=...`）加载外部 SB3 的关键。

2. **Turnstile 验证 Worker（可选，`server/worker.js`）**
   需要单独 `wrangler deploy`，部署后通过 `*.workers.dev` 域名访问。

> ⚠️ 重要：`remixwarp.pages.dev` 是 Cloudflare Pages 的免费子域名，
> **无法**给它绑定 Worker 路由（`zone_name = "remixwarp.pages.dev"` 不会生效）。
> 所以 `/api/verify-turnstile` 这类 Worker 路由不能部署在 `pages.dev` 域名上，
> 只能部署在自定义域名或 `*.workers.dev` 域名下。
> 而 `/api/project-proxy` 因为用的是 **Pages Functions**（随 Pages 站点内嵌），
> 天然就在 `remixwarp.pages.dev` 上生效，这正是推荐它的原因。

## 部署前端 + 项目代理（Pages Functions）

```bash
cd scratch-gui
bun run build          # 生成 build/ 目录
npx wrangler pages deploy build --project-name=remixwarp
```

`functions/api/project-proxy.js` 会被自动编译进 Pages Functions，
与站点部署在同一个域名上，前端直接用同源路径请求即可，无 CORS 问题。

验证：

```bash
curl -s "https://remixwarp.pages.dev/api/project-proxy?url=https%3A%2F%2Frw-vep.pages.dev%2FBV1Cu5m6kENy.sb3" -o /dev/null -w "%{http_code} %{content_type} %{size_download}\n"
```

应返回 `200 application/octet-stream <文件大小>`（二进制 SB3），
而不是 `200 text/html`（index.html 回退）。

## 本地开发

- `npm start`（webpack dev server）已内置 `/api/project-proxy` 中间件
  （见 `webpack.config.js` 的 `before` 钩子），可直接测试嵌入加载。
- `npm run server`（Node 服务器）也实现了同样的 `/api/project-proxy`
  路由（见 `server/index.js`），用于模拟生产环境。

## 准备 Turnstile Worker（可选）

1. **Cloudflare 账户**：确保你拥有 Cloudflare 账户
2. **域名**：确保 `remixwarp.pages.dev` 已在 Cloudflare 中配置
3. **Turnstile Secret Key**：从 [Cloudflare Turnstile 仪表盘](https://dash.cloudflare.com/?to=/:account/turnstile) 获取
4. **Wrangler CLI**：安装 Cloudflare 的命令行工具

## 步骤 1：安装 Wrangler

```bash
# 使用 npm 安装
npm install -g wrangler

# 或使用 yarn
yarn global add wrangler

# 或使用 pnpm
pnpm add -g wrangler
```

## 步骤 2：登录 Wrangler

```bash
wrangler login
```

这会打开浏览器，让你登录 Cloudflare 账户并授权 Wrangler。

## 步骤 3：部署 Worker

### 方法 A：使用 Wrangler CLI

1. **进入 server 目录**：
   ```bash
   cd server
   ```
2. **添加 Secret Key**：
   ```bash
   wrangler secret put TURNSTILE_SECRET_KEY
   ```
   当提示时，输入你的 Turnstile Secret Key。
3. **部署 Worker**：
   ```bash
   wrangler deploy
   ```

### 方法 B：使用 Cloudflare 仪表盘

1. **登录 Cloudflare 仪表盘**
2. **进入 Workers & Pages**
3. **点击 Create Application**
4. **选择 Create Worker**
5. **输入 Worker 名称**（例如 `remixwarp-turnstile-verifier`）
6. **将** **`worker.js`** **的内容复制到代码编辑器**
7. **点击 Settings → Variables**
8. **添加环境变量**：
   - 变量名：`TURNSTILE_SECRET_KEY`
   - 变量值：你的 Turnstile Secret Key
   - 勾选 "Encrypt" 选项
9. **点击 Save and Deploy**

## 步骤 4：部署 Worker（可选）

1. **进入 server 目录**：
   ```bash
   cd server
   ```
2. **添加环境变量**（如 `TURNSTILE_SECRET_KEY`、`AI_PROXY_TOKEN` 等，按 `worker.js` 需要）：
   ```bash
   wrangler secret put TURNSTILE_SECRET_KEY
   ```
3. **部署 Worker**：
   ```bash
   wrangler deploy
   ```

Worker 部署后访问地址为 `https://<你的-worker>.workers.dev`。
如果前端需要用它，请把对应的 API 地址改为该完整 URL（`worker.js`
已自带 CORS 头）。注意：**不能用 `remixwarp.pages.dev/api/*` 路由**，
`pages.dev` 子域名无法挂载 Worker 路由。

## 步骤 5：测试部署

1. **测试项目代理（Pages Function）**：
   ```bash
   curl -s "https://remixwarp.pages.dev/api/project-proxy?url=https%3A%2F%2Frw-vep.pages.dev%2FBV1Cu5m6kENy.sb3" -o /dev/null -w "%{http_code} %{content_type} %{size_download}\n"
   ```
   预期：`200 application/octet-stream`（二进制 SB3），而非 `200 text/html`。
2. **测试 Worker**（若已部署）：
   ```bash
   curl https://<你的-worker>.workers.dev/health
   ```

## 步骤 6：验证前端集成

1. **构建前端**：
   ```bash
   npm run build
   ```
2. **部署前端 + Pages Function**：
   ```bash
   npx wrangler pages deploy build --project-name=remixwarp
   ```
3. **测试嵌入加载**：
   - 打开 `https://remixwarp.pages.dev/fullscreen.html?project_url=https://rw-vep.pages.dev/BV1Cu5m6kENy.sb3`
   - 项目应正常加载；即使外部 URL 全部失败，也应弹出友好提示而不是崩溃。

## 故障排除

### 常见问题

1. **404 错误**：检查路由配置是否正确
2. **500 错误**：检查 Secret Key 是否正确配置
3. **CORS 错误**：Worker 代码已包含 CORS 头，应该不会出现此问题
4. **验证失败**：确保 Turnstile Site Key 和 Secret Key 匹配

### 日志查看

- **使用 Wrangler**：
  ```bash
  wrangler tail
  ```
- **使用 Cloudflare 仪表盘**：
  - 进入 Worker 详情页
  - 点击 Logs
  - 查看实时日志

## 安全注意事项

- **不要**将 Secret Key 存储在代码中或版本控制系统中
- **不要**在前端代码中暴露 Secret Key
- **定期**更新 Secret Key
- **监控** Worker 的使用情况，防止滥用

## 联系支持

如果遇到问题，请参考 [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/) 或联系 Cloudflare 支持。
