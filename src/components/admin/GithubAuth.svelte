<script>
// GitHub 认证条：OAuth（PKCE）登录为主，令牌输入为兜底

import {
	buildAuthorizeUrl,
	hasOAuthConfig,
} from "../../scripts/admin/github-oauth.js";
import {
	commitToken,
	tokenState,
} from "../../scripts/admin/github-token.svelte.js";
import Modal from "./Modal.svelte";

let { authExpired = $bindable(false) } = $props();

let token = $state("");
let modalOpen = $state(false);
let redirecting = $state(false);
let oauthError = $state("");

const authenticated = $derived(!!tokenState.value);

function logout() {
	commitToken(null);
	authExpired = false;
}

function openTokenModal() {
	token = "";
	oauthError = "";
	modalOpen = true;
}

function confirm() {
	const value = token.trim();
	if (!value) return;
	commitToken(value);
	authExpired = false;
	modalOpen = false;
}

async function loginWithGithub() {
	oauthError = "";
	try {
		redirecting = true;
		window.location.href = await buildAuthorizeUrl();
	} catch (error) {
		redirecting = false;
		oauthError = error.message || "发起登录失败";
	}
}
</script>

<div class="flex items-center justify-between gap-3 mb-6">
  <div class="flex items-center gap-2 min-w-0">
    <span
      class="w-2.5 h-2.5 rounded-full shrink-0 {authenticated ? 'bg-green-500' : 'bg-red-500'}"
      aria-hidden="true"
    ></span>
    <span class="text-75 text-sm truncate">
      {authenticated ? 'GitHub 已认证' : 'GitHub 未认证'}
    </span>
    {#if authExpired}
      <span class="text-red-500 text-xs shrink-0">令牌已失效，请重新登录</span>
    {/if}
  </div>
  {#if authenticated}
    <button
      type="button"
      class="btn-regular h-9 px-4 rounded-lg text-sm shrink-0"
      onclick={logout}
    >
      退出
    </button>
  {:else}
    <div class="flex items-center gap-2 shrink-0">
      {#if hasOAuthConfig()}
        <button
          type="button"
          class="h-9 px-4 rounded-lg text-sm text-white bg-[var(--primary)] hover:opacity-90 transition-opacity disabled:opacity-50"
          onclick={loginWithGithub}
          disabled={redirecting}
        >
          {redirecting ? '跳转中...' : '用 GitHub 登录'}
        </button>
      {/if}
      <button
        type="button"
        class="btn-regular h-9 px-4 rounded-lg text-sm"
        onclick={openTokenModal}
      >
        令牌登录
      </button>
    </div>
  {/if}
</div>

{#if oauthError}
  <p class="text-red-500 text-xs mb-4 -mt-2">登录失败：{oauthError}</p>
{/if}

<Modal bind:open={modalOpen} title="GitHub 认证">
  <p class="text-75 text-sm mb-4">
    填入 Personal Access Token（需 repo 权限）。令牌仅保存在本机 localStorage，不会上传。
  </p>
  <input
    type="password"
    bind:value={token}
    placeholder="ghp_..."
    class="w-full p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
    onkeydown={(event) => {
      if (event.key === 'Enter') confirm();
    }}
  />
  <div class="flex justify-end gap-2 mt-6">
    <button
      type="button"
      class="btn-regular h-10 px-5 rounded-lg text-sm"
      onclick={() => (modalOpen = false)}
    >
      取消
    </button>
    <button
      type="button"
      class="h-10 px-5 rounded-lg text-sm text-white bg-[var(--primary)] hover:opacity-90 transition-opacity disabled:opacity-50"
      onclick={confirm}
      disabled={!token.trim()}
    >
      确认
    </button>
  </div>
</Modal>
