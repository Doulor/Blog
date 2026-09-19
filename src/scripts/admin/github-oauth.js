/**
 * GitHub OAuth（PKCE）登录。
 *
 * 浏览器侧负责：生成 code_verifier / code_challenge（S256）、拼授权 URL、
 * 校验 state 防 CSRF；令牌最终写入 localStorage（与手填 PAT 同样的存储位置）。
 *
 * 令牌交换必须走同源的 Pages Function 中转（/api/github-exchange）：
 *   1. GitHub 的令牌接口不给浏览器发 CORS 头，前端直连会被拦死；
 *   2. OAuth App 的 client_secret 是必填项（PKCE 只是加固，不能替代它），
 *      密钥只存在服务端环境变量，不下发给浏览器。
 *
 * 配置（复用 GitHub 上已有的 "Blog" OAuth App）：
 *   1. Authorization callback URL 注册各站点 /admin/ 与本地调试地址
 *   2. Client ID 填在下面 GITHUB_CLIENT_ID（可公开，授权 URL 本就含它）
 *   3. Client Secret 配到 Pages 环境变量 GITHUB_CLIENT_SECRET（不要写进仓库）
 */

import { commitToken } from "./github-token.svelte.js";

export const GITHUB_CLIENT_ID = "Ov23liPDaFBJMNiNg5ZZ";

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const EXCHANGE_ENDPOINT = "/api/github-exchange";

// 公开仓库 contents 读写只需 public_repo；仓库转私有后改成 'repo'
const SCOPE = "public_repo";

const VERIFIER_KEY = "oauth_code_verifier";
const STATE_KEY = "oauth_state";

const UNRESERVED =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

function randomString(length) {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => UNRESERVED[byte % UNRESERVED.length]).join(
		"",
	);
}

function base64url(bytes) {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

async function sha256(text) {
	const data = new TextEncoder().encode(text);
	return crypto.subtle.digest("SHA-256", data);
}

export function hasOAuthConfig() {
	return !!GITHUB_CLIENT_ID;
}

function redirectUri() {
	return `${window.location.origin}/admin/`;
}

/**
 * 生成授权 URL，并把 code_verifier / state 存入 sessionStorage
 * （同一标签页跳转后仍可读取，且不写入 localStorage 避免长期残留）。
 */
export async function buildAuthorizeUrl() {
	const verifier = randomString(64);
	const state = randomString(32);
	const challenge = base64url(new Uint8Array(await sha256(verifier)));
	sessionStorage.setItem(VERIFIER_KEY, verifier);
	sessionStorage.setItem(STATE_KEY, state);

	const params = new URLSearchParams({
		client_id: GITHUB_CLIENT_ID,
		redirect_uri: redirectUri(),
		scope: SCOPE,
		state,
		code_challenge: challenge,
		code_challenge_method: "S256",
	});
	return `${AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * 回调交换令牌。校验 state 防 CSRF，校验 verifier 完成 PKCE 握手；
 * 一次性消费后立即清理 sessionStorage。成功后写入统一令牌键。
 *
 * 令牌交换走同源 Pages Function（/api/github-exchange）中转，绕开 GitHub
 * 令牌接口的 CORS 限制。
 *
 * @returns {Promise<boolean>}
 */
export async function exchangeCode(code, state) {
	const savedState = sessionStorage.getItem(STATE_KEY);
	const verifier = sessionStorage.getItem(VERIFIER_KEY);
	sessionStorage.removeItem(STATE_KEY);
	sessionStorage.removeItem(VERIFIER_KEY);

	if (!savedState || savedState !== state)
		throw new Error("登录状态校验失败，请重试");
	if (!verifier) throw new Error("登录会话已过期，请重新登录");

	const response = await fetch(EXCHANGE_ENDPOINT, {
		method: "POST",
		headers: { Accept: "application/json", "Content-Type": "application/json" },
		body: JSON.stringify({
			client_id: GITHUB_CLIENT_ID,
			code,
			code_verifier: verifier,
			redirect_uri: redirectUri(),
		}),
	});

	let data;
	try {
		data = await response.json();
	} catch {
		throw new Error(`交换令牌失败: ${response.status}`);
	}
	if (data.error) throw new Error(data.error_description || data.error);
	if (!data.access_token) throw new Error("GitHub 未返回访问令牌");

	commitToken(data.access_token);
	return true;
}
