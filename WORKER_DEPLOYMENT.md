# GitHub OAuth Cloudflare Worker 部署指南

## 1. 准备工作

### 1.1 设置 GitHub OAuth 应用
1. 访问 GitHub 开发者设置页面: `https://github.com/settings/developers`
2. 点击 "New OAuth App" 
3. 填写应用信息：
   - Application name: 为您的博客命名（如 "Firef Blog CMS"）
   - Homepage URL: `https://blog.firef.dpdns.org`
   - Authorization callback URL: `https://your-worker.your-subdomain.workers.dev/callback`
     - 将 `your-subdomain` 替换为您的 Cloudflare Workers 子域名

### 1.2 获取凭证
OAuth 应用创建后，您将获得：
- Client ID
- Client Secret

### 1.3 安装 Wrangler CLI
如果尚未安装 Wrangler：

```bash
npm install -g wrangler
```

## 2. 配置 Worker

### 2.1 编辑 wrangler.toml
修改 `wrangler.toml` 文件中的以下值：
- `account_id`: 您的 Cloudflare 账户 ID
- `zone_id`: 您域名的 Zone ID（如果使用路由）

### 2.2 设置环境变量
使用以下命令设置私密变量：

```bash
# 登录到 Cloudflare
wrangler login

# 设置 GitHub OAuth 凭证
wrangler secret put GITHUB_CLIENT_ID
# 粘贴您的 Client ID

wrangler secret put GITHUB_CLIENT_SECRET  
# 粘贴您的 Client Secret

wrangler secret put GITHUB_REDIRECT_URI
# 输入您的 Worker 回调 URL，例如：https://your-worker.your-subdomain.workers.dev/callback
```

## 3. 部署 Worker

```bash
# 部署到 Cloudflare Workers
wrangler deploy
```

## 4. 更新前端配置

确保前端页面中的 API 调用 URL 与您的 Worker 部署地址匹配：

- 认证 URL: `https://your-worker.your-subdomain.workers.dev/api/auth`
- GitHub API 代理: `https://your-worker.your-subdomain.workers.dev/api/github`

## 5. Worker 功能说明

### 5.1 认证流程
1. 用户访问 `/api/auth?callback=FRONTEND_CALLBACK_URL`
2. Worker 重定向到 GitHub 授权页面
3. 用户授权后，GitHub 重定向到 Worker 的 `/callback` 端点
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

## 6. 调试

如果遇到问题，可以使用调试页面：
- 访问 `/auth-debug.html` 检查当前认证状态
- 检查浏览器控制台中的错误信息
- 使用 `/api/test` 验证 Worker 是否正常运行

## 7. 安全注意事项

- OAuth 凭证存储在 Cloudflare 的安全密钥中
- 使用 state 参数防止 CSRF 攻击
- 所有 API 请求经过令牌验证
- CORS 头允许来自您的博客域名的请求