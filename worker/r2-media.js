/**
 * R2 媒体 Worker（列表 + 上传）
 *
 * 部署为与旧列表 Worker 同名的 r2img 后，r2img.doulor.cn 直接获得上传能力。
 * GET 列表保持旧契约的返回字段（name/url/key/size/uploaded 并按上传时间倒序），
 * 在此基础上新增 POST 上传接口。
 *
 * 接口:
 *   GET  /?dir=album/xxx          列出目录下媒体文件，返回 [{ name, url, key, size, uploaded }]
 *   POST /  (multipart/form-data) 上传文件，返回 { uploaded: [{ url, key }], errors: [] }
 *        表单字段: dir=目标目录, files=文件(可多个)
 *        请求头:   X-Upload-Token=<与 UPLOAD_TOKEN 环境变量一致>
 *   OPTIONS /                     CORS 预检
 */

const MEDIA_EXTENSIONS = [
	".jpg",
	".jpeg",
	".png",
	".gif",
	".webp",
	".avif",
	".bmp",
	".svg",
	".mp4",
	".webm",
	".ogg",
	".mov",
];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/** 常量时间比较，避免计时攻击 */
function tokensMatch(a, b) {
	if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length)
		return false;
	let result = 0;
	for (let i = 0; i < a.length; i++)
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return result === 0;
}

function corsHeaders() {
	return {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, X-Upload-Token",
		"Access-Control-Max-Age": "86400",
	};
}

function json(data, status = 200) {
	return new Response(JSON.stringify(data, null, 2), {
		status,
		headers: {
			"Content-Type": "application/json",
			Vary: "Origin",
			...corsHeaders(),
		},
	});
}

function hasMediaExtension(key) {
	const ext = key.toLowerCase().substring(key.lastIndexOf("."));
	return MEDIA_EXTENSIONS.includes(ext);
}

/**
 * R2 key 强制 ASCII：自定义域名（img.doulor.cn）不提供非 ASCII key，
 * 实测含中文的 key 永远 404（百分号编码也 404）。非 ASCII 字符统一替换为 _。
 */
function toAsciiKey(value) {
	return String(value || "").replace(/[^\w/.-]+/g, "_");
}

export default {
	async fetch(request, env) {
		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: corsHeaders() });
		}

		const url = new URL(request.url);

		// ---------- 列出目录（保持旧 Worker 的返回契约）----------
		if (request.method === "GET") {
			const directory = url.searchParams.get("dir") || "";
			if (!directory) {
				return json(
					{ error: "请提供目录参数，例如 ?dir=photos 或 ?dir=reality" },
					400,
				);
			}

			try {
				const prefix = directory.endsWith("/") ? directory : `${directory}/`;
				const list = await env.R2_BUCKET.list({ prefix });

				const mediaUrls = list.objects
					.filter((obj) => obj.size > 0 && hasMediaExtension(obj.key))
					.map((obj) => {
						const parts = obj.key.split("/");
						return {
							name: parts.pop(),
							url: `${env.PUBLIC_BASE_URL}/${obj.key}`,
							key: obj.key,
							size: obj.size,
							uploaded: obj.uploaded,
						};
					});

				// 按上传时间排序（最新的在前）
				mediaUrls.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));

				return json(mediaUrls);
			} catch (err) {
				console.error("Worker 错误:", err);
				return json({ error: err.message || "获取列表时发生错误" }, 500);
			}
		}

		// ---------- 上传文件 ----------
		if (request.method === "POST") {
			const uploadToken = env.UPLOAD_TOKEN;
			if (!uploadToken) {
				return json({ error: "服务端未配置 UPLOAD_TOKEN" }, 500);
			}
			const clientToken = request.headers.get("X-Upload-Token");
			if (!tokensMatch(clientToken || "", uploadToken)) {
				return json({ error: "上传令牌无效" }, 401);
			}

			let formData;
			try {
				formData = await request.formData();
			} catch {
				return json({ error: "请求体不是有效的 multipart 表单" }, 400);
			}

			const dir = toAsciiKey(
				(formData.get("dir") || "")
					.trim()
					.replace(/^\/+/, "")
					.replace(/\/+$/, ""),
			);
			if (!dir) return json({ error: "缺少 dir 字段" }, 400);

			const files = formData.getAll("files").filter((f) => f instanceof File);
			if (files.length === 0) return json({ error: "未检测到文件" }, 400);

			const results = [];
			const errors = [];

			for (const file of files) {
				// 安全的文件名：去路径、去非法字符、强制 ASCII（自定义域名不提供非 ASCII key）
				const safeName = toAsciiKey(
					file.name.replace(/[\\/]+/g, "").replace(/[^\w.\-一-龥]+/gu, "_"),
				);
				if (!safeName || !hasMediaExtension(safeName)) {
					errors.push({ name: file.name, error: "不支持的文件类型" });
					continue;
				}
				if (file.size > MAX_FILE_SIZE) {
					errors.push({ name: file.name, error: "文件超过 100MB 限制" });
					continue;
				}

				const key = `${dir}/${safeName}`;
				try {
					await env.R2_BUCKET.put(key, file.stream(), {
						httpMetadata: {
							contentType: file.type || "application/octet-stream",
						},
					});
					results.push({
						url: `${env.PUBLIC_BASE_URL}/${key}`,
						key,
						size: file.size,
					});
				} catch (error) {
					errors.push({ name: file.name, error: error.message });
				}
			}

			return json(
				{ uploaded: results, errors },
				errors.length && !results.length ? 500 : 200,
			);
		}

		return json({ error: "Method Not Allowed" }, 405);
	},
};
