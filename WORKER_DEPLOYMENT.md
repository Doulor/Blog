# GitHub OAuth Cloudflare Worker 部署指南

## 1. 准备工作

### 1.1 设置 GitHub OAuth 应用
1. 访问 GitHub 开发者设置页面: `https://github.com/settings/developers`
2. 点击 "New OAuth App"
3. 填写应用信息：
   - Application name: 为您的博客命名（如 "Firef Blog CMS"）
   - Homepage URL: `https://blog.firef.dpdns.org`
   - Authorization callback URL: `https://eblog.firef.dpdns.org/callback`
     - 注意：使用您的自定义域名，而不是workers.dev域名

### 1.2 获取凭证
OAuth 应用创建后，您将获得：
- Client ID
- Client Secret

## 2. 配置 Worker

### 2.1 通过Cloudflare Dashboard设置环境变量
在Cloudflare Dashboard中设置环境变量：

1. 在Worker设置中找到 "Settings" -> "Environment Variables"
2. 添加以下变量：
   - `GITHUB_CLIENT_ID`: 您的GitHub应用Client ID
   - `GITHUB_CLIENT_SECRET`: 您的GitHub应用Client Secret
   - `GITHUB_REDIRECT_URI`: `https://eblog.firef.dpdns.org/callback`
   - `CUSTOM_DOMAIN`: `https://eblog.firef.dpdns.org` （可选，用于明确指定自定义域）

### 2.2 （可选）使用Wrangler CLI部署
如果您选择使用Wrangler CLI（需要Node.js环境）：

1. 安装Wrangler：
   ```bash
   npm install -g wrangler
   ```

2. 登录Cloudflare：
   ```bash
   wrangler login
   ```

3. 设置环境变量：
   ```bash
   wrangler secret put GITHUB_CLIENT_ID
   # 粘贴您的 Client ID

   wrangler secret put GITHUB_CLIENT_SECRET
   # 粘贴您的 Client Secret

   wrangler secret put GITHUB_REDIRECT_URI
   # 输入: https://eblog.firef.dpdns.org/callback
   ```

## 3. 部署 Worker

### 3.1 通过Cloudflare Dashboard部署
1. 登录Cloudflare Dashboard
2. 在左侧菜单选择 "Workers & Pages" -> "Create application" -> "Create Worker"
3. 给Worker命名（例如 `github-oauth`）
4. 在代码编辑器中粘贴 `github-oauth-worker.js` 的全部内容
5. 点击 "Save and Deploy"

### 3.2 （可选）使用Wrangler CLI部署
```bash
# 部署到 Cloudflare Workers
wrangler deploy
```

## 4. 更新前端配置

确保前端页面中的 API 调用 URL 与您的自定义域名匹配：

- 认证 URL: `https://eblog.firef.dpdns.org/api/auth`
- GitHub API 代理: `https://eblog.firef.dpdns.org/api/github`

**注意**: 您需要更新前端代码中的API调用地址，将其从 `https://eblog-editor.2737855297.workers.dev` 改为 `https://eblog.firef.dpdns.org`

在您的 `src/pages/my-editor/index.html` 文件中，将:
```javascript
const proxyUrl = 'https://eblog.firef.dpdns.org/api/github';
```

同样，在 `public/auth.html` 文件中，认证请求地址会自动使用自定义域名。

## 5. Worker 功能说明

### 5.1 认证流程
1. 用户访问 `https://eblog.firef.dpdns.org/api/auth?callback=FRONTEND_CALLBACK_URL`
2. Worker 重定向到 GitHub 授权页面
3. 用户授权后，GitHub 重定向到 Worker 的 `https://eblog.firef.dpdns.org/callback` 端点
4. Worker 交换授权码获取访问令牌
5. Worker 重定向回前端回调页面并传递令牌

### 5.2 API 代理
Worker 代理所有 GitHub API 请求，提供以下功能：
- 验证访问令牌
- 转发请求到 GitHub API
- 添加适当的 CORS 头
- 错误处理

### 5.3 支持的端点
- `GET /api/auth` - 启动 OAuth 流程
- `GET /callback` - OAuth 回调端点  
- `GET/POST/PUT/DELETE /api/github/*` - GitHub API 代理
- `GET /api/test` - 测试端点

## 6. 配置自定义域路由

为了让您的自定义域 `eblog.firef.dpdns.org` 正确路由到Worker：

1. 在Worker的 "Triggers" 选项卡中
2. 添加以下路由规则：
   - `eblog.firef.dpdns.org/api/*` (处理所有API请求)
   - `eblog.firef.dpdns.org/callback` (处理OAuth回调)

## 8. 调试

如果遇到问题，可以使用调试页面：
- 访问 `/auth-debug.html` 检查当前认证状态
- 检查浏览器控制台中的错误信息
- 使用 `https://eblog.firef.dpdns.org/api/test` 验证 Worker 是否正常运行

## 9. 安全注意事项

- OAuth 凭证存储在 Cloudflare 的安全密钥中
- 使用 state 参数防止 CSRF 攻击
- 所有 API 请求经过令牌验证
- CORS 头允许来自您的博客域名的请求