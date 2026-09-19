/**
 * R2 上传中转（Pages Function）
 *
 * 为什么需要它：r2img worker 的上传接口要求 X-Upload-Token，令牌若下发浏览器，
 * 任何 XSS 都能偷走往 R2 桶乱传文件。这里用 GitHub 登录态做鉴权，令牌只在
 * 服务端环境变量里，浏览器永远拿不到。
 *
 * 链路：浏览器（带 GitHub token）→ 本接口校验身份 → 用 R2_UPLOAD_TOKEN
 *      转发 multipart 给 r2img worker → 原样透回结果
 *
 * 环境变量（用 wrangler 配置，不要写进仓库）：
 *   R2_UPLOAD_TOKEN   r2img worker 的 UPLOAD_TOKEN（两端同值）
 *   R2_WORKER_URL     可选，默认 https://r2img.doulor.cn
 *   ALLOWED_GH_LOGIN  可选，允许上传的 GitHub 用户名（逗号分隔），默认 Doulor
 *
 * 路由：POST /api/r2-upload
 * 请求体：原样 multipart（dir=目标目录, files=文件），与 worker 契约一致
 */

const WORKER_URL_DEFAULT = "https://r2img.doulor.cn";

export async function onRequestPost(context) {
	const { request, env } = context;

	// ---- 1. 鉴权：必须是已登录的允许用户 ----
	const authHeader = request.headers.get("Authorization") || "";
	const ghToken = authHeader.replace(/^Bearer\s+/i, "").trim();
	if (!ghToken) return json({ error: "未登录，请先登录 GitHub" }, 401);

	const allowed = (env.ALLOWED_GH_LOGIN || "Doulor")
		.split(",")
		.map((name) => name.trim())
		.filter(Boolean);

	let login = null;
	let ghStatus = "not-called";
	try {
		const resp = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `Bearer ${ghToken}`,
				Accept: "application/vnd.github+json",
				"User-Agent": "blog-admin-r2-upload",
			},
		});
		ghStatus = resp.status;
		console.log("github /user status:", resp.status, "auth header present:", !!authHeader);
		if (resp.ok) login = (await resp.json()).login;
	} catch (err) {
		ghStatus = `error: ${err.message}`;
		console.log("github /user error:", err.message);
	}
	if (!login)
		return json(
			{ error: `GitHub 身份校验失败 (debug: status=${ghStatus} authLen=${authHeader.length})` },
			401,
		);
	if (!allowed.includes(login))
		return json({ error: `用户 ${login} 无权上传` }, 403);

	// ---- 2. 转发 multipart 给 worker ----
	const uploadToken = env.R2_UPLOAD_TOKEN;
	if (!uploadToken) {
		return json({ error: "服务端未配置 R2_UPLOAD_TOKEN" }, 500);
	}
	const workerUrl = env.R2_WORKER_URL || WORKER_URL_DEFAULT;

	// 流式透传请求体：零额外 CPU、不受体积限制。
	// Content-Type 必须原样带上，否则丢失 multipart boundary。
	const contentType = request.headers.get("Content-Type");
	if (!contentType || !contentType.startsWith("multipart/form-data")) {
		return json({ error: "请求体必须是 multipart 表单" }, 400);
	}

	let resp;
	try {
		resp = await fetch(workerUrl, {
			method: "POST",
			headers: {
				"Content-Type": contentType,
				"X-Upload-Token": uploadToken,
			},
			body: request.body,
		});
	} catch (err) {
		return json({ error: `转发上传请求失败: ${err.message}` }, 502);
	}

	// 原样透回：worker 的错误体同样带 error，客户端已有解析逻辑
	const text = await resp.text();
	return new Response(text, {
		status: resp.status,
		headers: { "Content-Type": "application/json" },
	});
}

function json(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}
