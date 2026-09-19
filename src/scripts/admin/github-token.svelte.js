/**
 * 令牌的跨组件响应式来源。
 *
 * OAuth 回调在 AdminApp.onMount 里写入 localStorage，但同标签页不会触发 storage 事件，
 * 已挂载的 GithubAuth 无法自行感知；用模块级 $state 做单一事实源即可。
 */
import { migrateLegacyToken, setToken } from "./github-api.js";

export const tokenState = $state({ value: migrateLegacyToken() });

/** 写入 localStorage 并同步响应式状态 */
export function commitToken(value) {
	setToken(value);
	tokenState.value = value;
}
