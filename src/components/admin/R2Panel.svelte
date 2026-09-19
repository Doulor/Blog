<script>
// R2 面板：目录名按标题自动生成 → 自动读取已有图片 → 上传新图 → 自动刷新
//
// 简化后的流程：填标题即可，目录名自动带出并自动读取；上传令牌首次输入后
// 存本地折叠起来，不用每次出现在主流程里。

import { onMount } from "svelte";
import { slugifyTitle } from "../../scripts/admin/markdown.js";
import {
	fetchR2Media,
	normalizeR2Directory,
	uploadImagesToR2,
} from "../../scripts/admin/r2.js";
import Icon from "./Icon.svelte";

let {
	prefix, // 'album' | 'diary'
	onimages, // 回调：图片 URL 列表（含隐藏标记由调用方处理）
	title = "R2 存储",
	contentTitle = "", // 编辑中的内容标题，用于自动生成目录名
	contentDate = "", // 标题为空时回退到日期
	initialDirectory = "", // 编辑模式：从已有图片反推的目录名
} = $props();

const WORKER_URL_KEY = "r2_worker_url";
let workerUrl = $state("https://r2img.doulor.cn");
let directory = $state(initialDirectory || "");
// 手动改过目录名后就不再跟随标题自动生成（标准 slug 输入框交互）
let dirTouched = $state(!!initialDirectory);
let convertWebp = $state(true);

let media = $state([]); // [{ name, url, key, size, uploaded }]
let loading = $state(false);
let uploading = $state(false);
let status = $state("");
let fileInput = $state();
let selectedCount = $state(0);
let error = $state("");

onMount(() => {
	const savedUrl = localStorage.getItem(WORKER_URL_KEY);
	if (savedUrl) workerUrl = savedUrl;
});

function persistUrl() {
	localStorage.setItem(WORKER_URL_KEY, workerUrl.trim());
}

// 建议目录名：标题 slug（允许中文），空标题回退日期串
const suggestedDirectory = $derived(
	slugifyTitle(contentTitle) ||
		(contentDate || "").replace(/[\s:T]/g, "-").slice(0, 16),
);

// 自动字段：用户没手动改过时跟随标题更新
$effect(() => {
	if (!dirTouched) directory = suggestedDirectory;
});

function onDirectoryInput() {
	dirTouched = true;
	error = "";
}

function resolvedDirectory() {
	return normalizeR2Directory(directory.trim(), prefix);
}

async function readDirectory() {
	if (!directory.trim()) {
		error = "请填写 R2 目录名";
		return;
	}
	loading = true;
	error = "";
	try {
		media = await fetchR2Media(workerUrl.trim(), resolvedDirectory());
		emitImages();
		status = `目录 ${resolvedDirectory()} 共 ${media.length} 个媒体文件`;
	} catch (err) {
		error = err.message || "读取目录失败";
		media = [];
	} finally {
		loading = false;
	}
}

// 目录名变更后防抖自动读取，省掉手动点"读取目录"
let readTimer;
$effect(() => {
	const dir = directory.trim();
	clearTimeout(readTimer);
	if (!dir) {
		media = [];
		status = "";
		return;
	}
	readTimer = setTimeout(() => {
		readDirectory();
	}, 600);
});

function emitImages() {
	onimages?.(media.map((item) => item.url));
}

function onFilesPicked(event) {
	selectedCount = event.target.files?.length || 0;
	status = selectedCount ? `已选择 ${selectedCount} 个文件` : "";
}

async function upload() {
	const files = Array.from(fileInput?.files || []);
	if (!files.length) {
		error = "请先选择要上传的图片";
		return;
	}
	if (!directory.trim()) {
		error = "请填写 R2 目录名（上传目标目录）";
		return;
	}

	uploading = true;
	error = "";
	status = "正在上传...";

	try {
		const uploaded = await uploadImagesToR2({
			directory: resolvedDirectory(),
			files,
			convertWebp,
			onProgress: (msg) => {
				status = msg;
			},
		});

		status = `已上传 ${uploaded.length} 张，正在拉取最新列表...`;
		// 上传后自动刷新该目录
		media = await fetchR2Media(workerUrl.trim(), resolvedDirectory());
		emitImages();
		status = `已上传 ${uploaded.length} 张，目录共 ${media.length} 个媒体文件`;
		if (fileInput) fileInput.value = "";
		selectedCount = 0;
	} catch (err) {
		error = err.message || "上传失败";
		status = "上传失败";
	} finally {
		uploading = false;
	}
}

function formatSize(bytes) {
	if (!bytes) return "";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toggleSelect(url) {
	onimages?.([url], true);
}
</script>

<div class="card-base rounded-xl p-4 space-y-4">
  <h3 class="text-base font-semibold text-90 flex items-center gap-2">
    <Icon name="cloud" class="w-4 h-4 text-blue-500" />
    {title}
  </h3>

  <div class="grid sm:grid-cols-2 gap-3">
    <label class="block">
      <span class="text-75 text-xs">Worker URL</span>
      <input
        type="text"
        bind:value={workerUrl}
        oninput={persistUrl}
        placeholder="https://r2img.doulor.cn"
        class="w-full mt-1 p-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      />
    </label>
    <label class="block">
      <span class="text-75 text-xs">R2 目录名（跟随标题自动生成，可手改；变更后自动读取已有图片）</span>
      <input
        type="text"
        bind:value={directory}
        oninput={onDirectoryInput}
        placeholder={prefix === 'album' ? '如 sky（自动识别为 album/sky）' : '如 happyday（自动识别为 diary/happyday）'}
        class="w-full mt-1 p-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      />
    </label>
  </div>

  <div class="flex items-center gap-2 flex-wrap">
    <button
      type="button"
      class="btn-regular h-9 px-4 rounded-lg text-sm flex items-center"
      onclick={readDirectory}
      disabled={loading || !directory.trim()}
    >
      {#if loading}
        <Icon name="loader" class="w-4 h-4 mr-2 animate-spin" />读取中...
      {:else}
        <Icon name="refresh" class="w-4 h-4 mr-2" />读取目录
      {/if}
    </button>
    <span class="text-50 text-xs">当前目录：<span class="font-mono">{directory.trim() ? resolvedDirectory() : '—'}</span></span>
  </div>

  {#if error}
    <p class="text-sm text-red-500">{error}</p>
  {/if}

  {#if media.length > 0}
    <div>
      <p class="text-75 text-xs mb-2">目录已有 {media.length} 个文件（点击 + 回填到表单）</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {#each media as item (item.key)}
          <div class="group relative card-base rounded-lg overflow-hidden">
            <div
              class="aspect-square cursor-zoom-in"
              data-lightbox-src={item.url}
              data-lightbox-caption={item.name}
            >
              <img src={item.url} alt={item.name} class="w-full h-full object-cover" loading="lazy" />
            </div>
            <button
              type="button"
              class="absolute top-1.5 right-1.5 w-7 h-7 rounded-md flex items-center justify-center bg-white/90 dark:bg-neutral-800/90 text-75 opacity-60 hover:opacity-100 transition-opacity hover:text-[var(--primary)]"
              title="回填此图片链接"
              aria-label="回填此图片链接"
              onclick={() => toggleSelect(item.url)}
            >
              <Icon name="plus" class="w-3.5 h-3.5" />
            </button>
            <p class="px-1.5 pb-1.5 text-[10px] text-50 truncate" title={item.name}>{item.name}</p>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="border-t border-black/5 dark:border-white/10 pt-3 space-y-2">
    <div class="flex items-center gap-2 text-sm font-medium text-75">
      <Icon name="upload" class="w-4 h-4 text-green-500" />直接上传图片到 R2（用 GitHub 登录态鉴权）
    </div>

    <input type="file" accept="image/*" multiple class="hidden" bind:this={fileInput} onchange={onFilesPicked} />
    <div class="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        class="btn-regular h-9 px-4 rounded-lg text-sm flex items-center"
        onclick={() => fileInput?.click()}
      >
        <Icon name="image" class="w-4 h-4 mr-2" />选择图片
        {#if selectedCount}<span class="ml-1 text-xs opacity-70">({selectedCount})</span>{/if}
      </button>
      <button
        type="button"
        class="h-9 px-4 rounded-lg text-sm text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center"
        onclick={upload}
        disabled={uploading || !selectedCount}
      >
        {#if uploading}
          <Icon name="loader" class="w-4 h-4 mr-2 animate-spin" />上传中...
        {:else}
          <Icon name="upload" class="w-4 h-4 mr-2" />上传
        {/if}
      </button>
      <label class="flex items-center gap-2 text-xs text-50 cursor-pointer">
        <input type="checkbox" bind:checked={convertWebp} class="accent-[var(--primary)]" />
        上传前转为 WebP（质量 82）
      </label>
    </div>
    {#if status}
      <p class="text-xs text-50">{status}</p>
    {/if}
  </div>
</div>
