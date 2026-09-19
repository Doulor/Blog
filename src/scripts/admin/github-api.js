/**
 * GitHub 内容 API 封装
 *
 * 供内容创建器 / 内容管理器 / 管理台共用：读取、提交（创建/更新）、删除文件，
 * 以及 UTF-8 安全的 base64 编解码。令牌统一存在 github_access_token。
 */

const GITHUB_API = "https://api.github.com";
export const GITHUB_OWNER = "Doulor";
export const GITHUB_REPO = "Blog";
export const GITHUB_BRANCH = "main";

const TOKEN_KEY = "github_access_token";

/** 旧的令牌键名，存在则迁移到统一键名 */
const LEGACY_TOKEN_KEY = "github_token";

/** 内容类型 → 内容目录名（对应 src/content/<dir>） */
const CONTENT_TYPE_DIR = {
	post: "posts",
	diary: "diary",
	thought: "thoughts",
	album: "albums",
};

export function contentTypeDir(type) {
	return CONTENT_TYPE_DIR[type] || null;
}

/** 内容类型 → 完整文件路径（不含后缀） */
export function contentFilePath(type, slug) {
	const dir = contentTypeDir(type);
	if (!dir) return null;
	return `src/content/${dir}/${slug}.md`;
}

export function getToken() {
	return localStorage.getItem(TOKEN_KEY) || null;
}

export function setToken(token) {
	if (token) localStorage.setItem(TOKEN_KEY, token);
	else localStorage.removeItem(TOKEN_KEY);
}

/** 旧键名令牌一次性迁移；返回迁移后的令牌 */
export function migrateLegacyToken() {
	const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
	if (legacy && !localStorage.getItem(TOKEN_KEY)) {
		localStorage.setItem(TOKEN_KEY, legacy);
	}
	if (legacy) localStorage.removeItem(LEGACY_TOKEN_KEY);
	return getToken();
}

/** UTF-8 安全的 base64 编码（btoa 不支持非 ASCII） */
export function utf8ToBase64(text) {
	const bytes = new TextEncoder().encode(text);
	let binary = "";
	for (let i = 0; i < bytes.length; i++)
		binary += String.fromCharCode(bytes[i]);
	return btoa(binary);
}

/** UTF-8 安全的 base64 解码 */
export function base64ToUtf8(base64) {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return new TextDecoder("utf-8").decode(bytes);
}

function authHeaders(token, extra = {}) {
	return { Authorization: `Bearer ${token}`, ...extra };
}

/**
 * 读取文件。返回 { content, sha }，文件不存在返回 null。
 * 401/403 抛出带标记的错误，调用方可据此清除失效令牌。
 */
export async function getFile(path, token = getToken()) {
	if (!token) throw new Error("请先进行 GitHub 认证");

	const response = await fetch(
		`${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
		{ headers: authHeaders(token) },
	);

	if (response.status === 404) return null;
	if (!response.ok) {
		const error = new Error(`获取文件失败: ${response.status}`);
		error.status = response.status;
		error.authExpired = response.status === 401 || response.status === 403;
		throw error;
	}

	const data = await response.json();
	return {
		content: base64ToUtf8(data.content.replace(/\n/g, "")),
		sha: data.sha,
	};
}

/** 提交文件（不存在则创建，存在则需传 sha 才会更新）。返回接口响应。 */
export async function putFile(
	path,
	content,
	{ sha = null, message, token = getToken() } = {},
) {
	if (!token) throw new Error("请先进行 GitHub 认证");

	const body = {
		message: message || `添加/更新 ${path} [通过管理台]`,
		content: utf8ToBase64(content),
		branch: GITHUB_BRANCH,
	};
	if (sha) body.sha = sha;

	const response = await fetch(
		`${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
		{
			method: "PUT",
			headers: authHeaders(token, { "Content-Type": "application/json" }),
			body: JSON.stringify(body),
		},
	);

	const data = await response.json().catch(() => ({}));

	if (!response.ok) {
		const error = new Error(data.message || `提交失败: ${response.status}`);
		error.status = response.status;
		error.authExpired = response.status === 401 || response.status === 403;
		error.githubMessage = data.message;
		throw error;
	}

	return data;
}

/** 便捷方法：自动查询 sha 后提交（存在即覆盖）。 */
export async function putFileAutoSha(path, content, options = {}) {
	let sha = null;
	try {
		const existing = await getFile(path, options.token);
		if (existing) sha = existing.sha;
	} catch {
		// 读取失败（如 404）按新建处理
	}
	return putFile(path, content, { ...options, sha });
}

/** 删除文件，需提供文件 sha。 */
export async function deleteFile(
	path,
	sha,
	{ message, token = getToken() } = {},
) {
	if (!token) throw new Error("请先进行 GitHub 认证");

	const response = await fetch(
		`${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
		{
			method: "DELETE",
			headers: authHeaders(token, { "Content-Type": "application/json" }),
			body: JSON.stringify({
				message: message || `删除 ${path} [通过管理台]`,
				sha,
			}),
		},
	);

	if (!response.ok) {
		const data = await response.json().catch(() => ({}));
		const error = new Error(data.message || `删除失败: ${response.status}`);
		error.status = response.status;
		error.authExpired = response.status === 401 || response.status === 403;
		throw error;
	}

	return true;
}

/** 读取后删除（自动获取 sha）。 */
export async function deleteFileAutoSha(path, options = {}) {
	const file = await getFile(path, options.token);
	if (!file) throw new Error("文件不存在，可能已被删除");
	return deleteFile(path, file.sha, options);
}
