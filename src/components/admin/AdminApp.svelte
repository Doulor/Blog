<script>
// 管理台根组件：列表 / 新建 / 编辑 三态切换

import { onMount } from "svelte";
import {
	contentFilePath,
	deleteFileAutoSha,
	getFile,
	putFileAutoSha,
} from "../../scripts/admin/github-api.js";
import { exchangeCode } from "../../scripts/admin/github-oauth.js";
import {
	generateMarkdown,
	parseFrontmatter,
} from "../../scripts/admin/markdown.js";
import ContentList from "./ContentList.svelte";
import EditorPanel from "./EditorPanel.svelte";
import GithubAuth from "./GithubAuth.svelte";
import Modal from "./Modal.svelte";

let { items = [] } = $props();

// view: 'list' | 'create' | 'edit'
let view = $state("list");
let activeType = $state("post"); // 新建表单类型
let editing = $state(null); // { type, slug, filePath }
let authExpired = $state(false);
let busy = $state(false);
let toast = $state(null);

// 列表本地副本：提交/删除后乐观更新，不整页 reload
let localItems = $state([...items]);

let confirmDelete = $state(null); // { type, slug, title }
let deleteModalOpen = $state(false);

let resultModalOpen = $state(false);
let resultContent = $state("");
let resultFileName = $state("");
let resultDirectory = $state("");

// 兼容旧路由深链：/admin/?view=create 等
onMount(() => {
	const params = new URLSearchParams(window.location.search);

	// OAuth（PKCE）回调：?code=&state=，成功后清掉查询串，刷新不会重复交换
	const oauthCode = params.get("code");
	const oauthState = params.get("state");
	if (oauthCode && oauthState) {
		busy = true;
		exchangeCode(oauthCode, oauthState)
			.then(() => {
				authExpired = false;
				showToast("GitHub 登录成功", "success");
			})
			.catch((error) => {
				showToast(`GitHub 登录失败: ${error.message || "未知错误"}`, "error");
			})
			.finally(() => {
				busy = false;
				window.history.replaceState(null, "", window.location.pathname);
			});
		return;
	}

	const viewParam = params.get("view");
	if (viewParam === "create" || viewParam === "edit") view = viewParam;

	// 兼容旧 my-editor 的深链：URL param（?view=edit&type=&slug=&filePath=）优先于 localStorage
	const urlType = params.get("type");
	const urlSlug = params.get("slug");
	const urlFilePath = params.get("filePath");
	if (urlType && urlSlug) {
		startEdit(urlType, urlSlug, urlFilePath || undefined);
		return;
	}

	const legacyFilePath = localStorage.getItem("editingFilePath");
	if (legacyFilePath) {
		const type = localStorage.getItem("editingType");
		const slug = localStorage.getItem("editingSlug");
		if (type && slug) startEdit(type, slug, legacyFilePath);
		for (const key of [
			"editContent",
			"editingType",
			"editingSlug",
			"editingFilePath",
		]) {
			localStorage.removeItem(key);
		}
	}
});

function showToast(message, type = "info") {
	toast = { message, type };
	setTimeout(() => {
		toast = null;
	}, 3200);
}

function startCreate(type) {
	activeType = type;
	editing = null;
	view = "create";
}

async function startEdit(type, slug, filePath) {
	busy = true;
	try {
		const path = filePath || contentFilePath(type, slug);
		const file = await getFile(path);
		if (!file) {
			showToast("文件不存在，可能已被删除", "error");
			return;
		}
		const { data, content } = parseFrontmatter(file.content);
		editing = { type, slug, filePath: path, data, content, sha: file.sha };
		activeType = type;
		view = "edit";
	} catch (error) {
		if (error.authExpired) {
			authExpired = true;
			showToast("认证令牌无效或已过期，请重新输入", "error");
		} else {
			showToast(`获取内容失败: ${error.message}`, "error");
		}
	} finally {
		busy = false;
	}
}

function requestDelete(type, slug, title) {
	confirmDelete = { type, slug, title };
	deleteModalOpen = true;
}

async function performDelete() {
	if (!confirmDelete) return;
	const { type, slug, title } = confirmDelete;
	busy = true;
	try {
		await deleteFileAutoSha(contentFilePath(type, slug));
		localItems = localItems.filter(
			(item) => !(item.type === type && item.slug === slug),
		);
		showToast(`已删除「${title}」，等待部署生效`, "success");
	} catch (error) {
		if (error.authExpired) {
			authExpired = true;
			showToast("认证令牌无效或已过期，请重新输入", "error");
		} else {
			showToast(`删除失败: ${error.message}`, "error");
		}
	} finally {
		busy = false;
		deleteModalOpen = false;
		confirmDelete = null;
	}
}

// EditorPanel 提交：生成 → 预览 → 提交到 GitHub
function onGenerated(event) {
	const { content, fileName, directory } = event.detail;
	resultContent = content;
	resultFileName = fileName;
	resultDirectory = directory;
	resultModalOpen = true;
}

async function submitToGithub() {
	if (!resultFileName) {
		showToast("请先生成内容并填写文件名", "error");
		return;
	}
	const fullPath = `${resultDirectory}/${resultFileName}`.replace(/^\/+/, "");
	busy = true;
	try {
		await putFileAutoSha(fullPath, resultContent);
		resultModalOpen = false;
		const wasEditing = !!editing;
		// 乐观更新列表
		if (wasEditing) {
			localItems = localItems.map((item) =>
				item.type === editing.type && item.slug === editing.slug
					? {
							...item,
							title: titleOf(editing.type, resultContent),
							date: new Date().toISOString(),
						}
					: item,
			);
		}
		showToast(
			wasEditing ? "已提交更新，等待部署生效" : "已提交新内容，等待部署生效",
			"success",
		);
	} catch (error) {
		if (error.authExpired) {
			authExpired = true;
			resultModalOpen = false;
			showToast("认证令牌无效或已过期，请重新输入", "error");
		} else {
			showToast(`提交失败: ${error.message}`, "error");
		}
	} finally {
		busy = false;
	}
}

function titleOf(_type, content) {
	const { data } = parseFrontmatter(content);
	return data.title || data.content || "未命名";
}

function backToList() {
	view = "list";
	editing = null;
}

const TYPE_LABELS = {
	post: "帖子",
	diary: "日记",
	album: "相册",
	thought: "碎碎念",
};
function typeLabel(type) {
	return TYPE_LABELS[type] || type;
}
</script>

<div class="space-y-6">
  <header>
    <h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">管理台</h1>
    <p class="text-neutral-600 dark:text-neutral-400">创建、编辑与删除博客内容</p>
  </header>

  <GithubAuth bind:authExpired />

  <nav class="flex items-center gap-2 flex-wrap">
    <button
      type="button"
      class="btn-card h-10 px-4 rounded-lg text-sm {view === 'list' ? 'text-[var(--primary)]' : ''}"
      onclick={backToList}
    >
      内容列表
    </button>
    {#each ['post', 'diary', 'album', 'thought'] as type}
      <button
        type="button"
        class="btn-card h-10 px-4 rounded-lg text-sm {view === 'create' && activeType === type ? 'text-[var(--primary)]' : ''}"
        onclick={() => startCreate(type)}
      >
        新建{typeLabel(type)}
      </button>
    {/each}
  </nav>

  {#if busy}
    <div class="flex items-center gap-2 text-75 text-sm">
      <i class="fa fa-spinner fa-spin" aria-hidden="true"></i> 处理中...
    </div>
  {/if}

  {#if view === 'list'}
    <ContentList
      items={localItems}
      onedit={(event) => startEdit(event.detail.type, event.detail.slug)}
      ondelete={(event) => requestDelete(event.detail.type, event.detail.slug, event.detail.title)}
    />
  {:else}
    {#key activeType + view + (editing?.filePath ?? '')}
      <EditorPanel
        mode={view === 'edit' ? 'edit' : 'create'}
        type={activeType}
        {editing}
        ongenerated={onGenerated}
        onback={backToList}
      />
    {/key}
  {/if}
</div>

{#if toast}
  <div
    class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] px-5 py-3 rounded-xl shadow-2xl text-sm text-white {toast.type === 'error' ? 'bg-red-600' : toast.type === 'success' ? 'bg-green-600' : 'bg-neutral-800 dark:bg-neutral-700'}"
    role="status"
  >
    {toast.message}
  </div>
{/if}

<Modal bind:open={deleteModalOpen} title="确认删除">
  {#if confirmDelete}
    <p class="text-75 text-sm mb-6">
      将删除「{confirmDelete.title}」，此操作会直接提交到 GitHub 仓库。
    </p>
    <div class="flex justify-end gap-2">
      <button
        type="button"
        class="btn-regular h-10 px-5 rounded-lg text-sm"
        onclick={() => (deleteModalOpen = false)}
      >
        取消
      </button>
      <button
        type="button"
        class="h-10 px-5 rounded-lg text-sm text-white bg-red-600 hover:bg-red-700 transition-colors"
        onclick={performDelete}
      >
        确认删除
      </button>
    </div>
  {/if}
</Modal>

<Modal bind:open={resultModalOpen} title="提交到 GitHub" width="max-w-2xl">
  <div class="space-y-4">
    <label class="block">
      <span class="text-75 text-sm">文件名</span>
      <input
        type="text"
        bind:value={resultFileName}
        class="w-full mt-1 p-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      />
    </label>
    <div>
      <span class="text-75 text-sm">目录：<span class="text-90 font-mono">{resultDirectory}</span></span>
      <pre class="mt-1 max-h-72 overflow-auto p-3 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-xs font-mono text-75 whitespace-pre-wrap break-all">{resultContent}</pre>
    </div>
    <div class="flex justify-end gap-2">
      <button
        type="button"
        class="btn-regular h-10 px-5 rounded-lg text-sm"
        onclick={() => navigator.clipboard.writeText(resultContent)}
      >
        复制
      </button>
      <button
        type="button"
        class="h-10 px-5 rounded-lg text-sm text-white bg-[var(--primary)] hover:opacity-90 transition-opacity"
        onclick={submitToGithub}
      >
        提交
      </button>
    </div>
  </div>
</Modal>
