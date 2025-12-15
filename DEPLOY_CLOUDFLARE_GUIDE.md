# 部署到 Cloudflare Pages 的完整指南

## 第一步：设置 GitHub 仓库

1. 确保您的代码已推送到 GitHub 仓库
2. 如果还没有，请创建一个新的 GitHub 仓库并推送代码

## 第二步：创建 GitHub OAuth App（用于 CMS 认证）

1. 访问 GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. 设置以下信息：
   - Application name: 您的博客名称
   - Homepage URL: https://your-project-name.pages.dev (Cloudflare Pages URL)
   - Authorization callback URL: https://your-project-name.pages.dev/api/catch/github
3. 记下 Client ID 和生成的 Client Secret

## 第三步：部署到 Cloudflare Pages

1. 访问 https://dash.cloudflare.com/login
2. 选择您的账户 → Pages → Create a project
3. 选择您的 GitHub 仓库
4. 配置构建设置：
   - 构建命令：`pnpm build`
   - 构建输出目录：`dist`
   - 环境变量：
     - `NODE_VERSION`: `20`
     - `CMS_GITHUB_APP_CLIENT_ID`: [您的 GitHub OAuth App 的 Client ID]
     - `CMS_GITHUB_APP_CLIENT_SECRET`: [您的 GitHub OAuth App 的 Client Secret]
     - `CMS_BRANCH`: `main`
     - `CMS_GITHUB_REPO`: `your-username/your-repository-name`

## 第四步：配置 CMS

1. 在 Cloudflare Pages 项目设置中，确保环境变量已正确设置
2. 部署完成后，访问 https://your-project-name.pages.dev/admin/
3. 首次访问时，系统会引导您完成 GitHub 认证

## 第五步：使用 CMS

1. 访问 `https://your-project-name.pages.dev/admin/`
2. 使用 GitHub 账户登录
3. 开始创建和编辑内容

## 重要提示

- 确保您的 GitHub 仓库设置为公开，或者您的 OAuth App 有适当的权限
- 所有内容更改将直接提交到您的 GitHub 仓库的 main 分支
- 图片等媒体文件将上传到仓库的 public/assets/images 目录
- 每次内容更改后，Cloudflare Pages 会自动重新部署网站

## 常见问题

### 如果 CMS 无法加载：
- 检查环境变量是否正确设置
- 确认 OAuth App 的回调 URL 设置正确
- 检查仓库名称是否在配置文件中正确指定

### 如果认证失败：
- 确保 OAuth App 有 'repo' 和 'user:email' 权限
- 检查授权回调 URL 是否指向正确的 Cloudflare Pages 域名