# R2 媒体 Worker

为内容创建器提供图片**上传**与**列表**能力的 Cloudflare Worker。

部署为与旧列表 Worker 同名的 `r2img`，因此 `r2img.doulor.cn` 直接获得上传能力，
内容创建器里已保存的 Worker 地址**无需修改**；`GET` 列表保持旧 Worker 的返回契约
（`name/url/key/size/uploaded` 并按上传时间倒序），覆盖部署不影响现有相册/日记。

## 一次性部署（约 2 分钟）

前置：已安装 Node 18+ 和本仓库依赖（`pnpm install`）。在**仓库根目录**执行。

```bash
# 1. 登录 Cloudflare（浏览器授权，只需一次）
pnpm worker:login

# 2. 设置上传令牌（secret，不进仓库）——输入一个足够随机的字符串
pnpm worker:secret

# 3. 部署
pnpm worker:deploy
```

> **Windows 坑 1**：不要用 `npx wrangler`。npx 的临时安装常漏装
> `@cloudflare/workerd-windows-64` 导致启动即崩。本仓库已把 wrangler 装为
> devDependency，用 `pnpm worker:*` 或 `pnpm exec wrangler` 即可。
>
> **Windows 坑 2（代理）**：若系统设了 `HTTPS_PROXY`/`ALL_PROXY`，
> `wrangler login` 换令牌的请求走代理会失败。解决办法是给当前命令窗口设
> `NO_PROXY` 例外（代理变量本身不用删）：
> - cmd：`set "NO_PROXY=dash.cloudflare.com,api.cloudflare.com,localhost,127.0.0.1" & pnpm worker:login`
> - bash：`NO_PROXY="..." pnpm worker:login`

## 在内容创建器里使用

部署完成后，在内容创建器的 R2 区域：

1. **Worker URL** 填 `https://r2img.doulor.cn`
2. **上传令牌** 填第 2 步设置的 `UPLOAD_TOKEN`（存在浏览器 localStorage，不上传）
3. 选择图片 → 自动转 WebP（质量 82，可关）→ 上传 → 链接自动填入

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/?dir=album/xxx` | 列出目录下媒体，返回 `[{name,url,key,size,uploaded}]`（按 uploaded 倒序） |
| `POST` | `/` | multipart：`dir` + `files[]`，需 `X-Upload-Token` 头，返回 `{uploaded:[{url,key,size}],errors:[]}` |
| `OPTIONS` | `/` | CORS 预检 |

## 安全说明

- 上传必须携带 `X-Upload-Token`，与服务端 `UPLOAD_TOKEN` 常量时间比较，防止开放上传被滥用。
- 仅接受图片/视频扩展名，单文件上限 100MB。
- 令牌存在浏览器 localStorage（与 GitHub PAT 同样的存储方式）。
