# Cloudflare Worker 部署指南

## 概述

本指南将帮助你将 Turnstile 验证 Worker 部署到 Cloudflare，以便前端可以通过 `https://remixwarp.pages.dev/api/verify-turnstile` 访问验证服务。

## 准备工作

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
6. **将 `worker.js` 的内容复制到代码编辑器**
7. **点击 Settings → Variables**
8. **添加环境变量**：
   - 变量名：`TURNSTILE_SECRET_KEY`
   - 变量值：你的 Turnstile Secret Key
   - 勾选 "Encrypt" 选项
9. **点击 Save and Deploy**

## 步骤 4：配置路由

### 使用 Wrangler 配置

`wrangler.toml` 文件中已经包含了路由配置：

```toml
routes = [
  {
    pattern = "remixwarp.pages.dev/api/*",
    zone_name = "remixwarp.pages.dev"
  }
]
```

### 使用 Cloudflare 仪表盘配置

1. **进入 Workers & Pages**
2. **选择你的 Worker**
3. **点击 Triggers**
4. **点击 Add Route**
5. **输入路由模式**：`remixwarp.pages.dev/api/*`
6. **选择你的域名**：`remixwarp.pages.dev`
7. **点击 Save**

## 步骤 5：测试部署

1. **测试健康检查**：
   ```bash
   curl https://remixwarp.pages.dev/health
   ```
   预期响应：
   ```json
   {"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
   ```

2. **测试验证 API**：
   ```bash
   curl -X POST https://remixwarp.pages.dev/api/verify-turnstile \
     -H "Content-Type: application/json" \
     -d '{"token":"test-token"}'
   ```
   预期响应（测试 token 会失败）：
   ```json
   {"success":false,"error-codes":["invalid-input-response"]}
   ```

## 步骤 6：验证前端集成

1. **构建前端**：
   ```bash
   npm run build
   ```

2. **部署前端**：将 `build` 目录部署到 Cloudflare Pages

3. **测试协作功能**：
   - 打开 `https://remixwarp.pages.dev/editor.html`
   - 尝试创建或加入房间
   - 验证 Turnstile 验证是否正常工作

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
