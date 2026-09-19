<script>
// 统一编辑器：mode='create'|'edit' × 4 类型，全部字段
import {
	generateMarkdown,
	getCurrentDate,
	getCurrentDateTime,
	parseSingleDiaryHiddenMarker,
} from "../../scripts/admin/markdown.js";
import Icon from "./Icon.svelte";
import ImageGrid from "./ImageGrid.svelte";
import R2Panel from "./R2Panel.svelte";

let { mode = "create", type, editing = null, ongenerated, onback } = $props();

const R2_BASE = "https://img.doulor.cn";

function emptyForm(t) {
	const today = getCurrentDate();
	switch (t) {
		case "post":
			return {
				title: "",
				published: today,
				description: "",
				tags: "",
				category: "",
				content: "",
				useImage: false,
				image: "",
				pinned: false,
				draft: false,
				usePassword: false,
				password: "666999",
				useAuthor: false,
				author: "",
				useSource: false,
				sourceLink: "",
				useLicense: false,
				licenseName: "",
			};
		case "diary":
			return {
				title: "",
				date: getCurrentDateTime(),
				description: "",
				tags: "",
				secret: "",
				password: "",
				imageType: "local",
				images: [],
				content: "",
			};
		case "album":
			return {
				title: "",
				date: today,
				description: "",
				location: "",
				tags: "",
				hidden: false,
				layout: "grid",
				columns: 3,
				cover: "",
				albumType: "local",
				photos: [],
			};
		case "thought":
			return { content: "", date: today, context: "" };
	}
	return {};
}

let form = $state(emptyForm(type));

// 编辑模式：用远端解析结果回填表单
$effect(() => {
	if (mode === "edit" && editing?.data) {
		const data = editing.data;
		const base = emptyForm(type);
		if (type === "post") {
			form = {
				...base,
				title: data.title ?? "",
				published:
					data.published ?? editing.slug.split("-").slice(0, 3).join("-"),
				description: data.description ?? "",
				tags: (data.tags ?? []).join(", "),
				category: data.category ?? "",
				content: editing.content ?? "",
				pinned: !!data.pinned,
				draft: !!data.draft,
				useImage: !!data.image,
				image: data.image ?? "",
				usePassword: !!data.encrypted,
				password: data.password ?? "666999",
				useAuthor: !!data.author,
				author: data.author ?? "",
				useSource: !!data.sourceLink,
				sourceLink: data.sourceLink ?? "",
				useLicense: !!data.licenseName,
				licenseName: data.licenseName ?? "",
			};
		} else if (type === "diary") {
			const rawDate = (data.date ?? "").toString();
			form = {
				...base,
				title: data.title ?? "",
				date: rawDate.replace(" ", "T"),
				description: data.description ?? "",
				tags: (data.tags ?? []).join(", "),
				secret: data.secret ?? "",
				password: data.password ?? "",
				imageType: (data.images ?? []).length ? "r2" : "local",
				images: (data.images ?? []).map((value) => {
					const marker = parseSingleDiaryHiddenMarker(value);
					return marker
						? { url: marker.value, hidden: true, hiddenLabel: marker.label }
						: { url: value, hidden: false, hiddenLabel: "" };
				}),
				content: editing.content ?? "",
			};
		} else if (type === "album") {
			const photos = (data.photos ?? []).map((p) =>
				typeof p === "string" ? p : p.src,
			);
			const isR2 =
				data.mode === "external" &&
				photos.some((src) => src.startsWith(R2_BASE));
			form = {
				...base,
				title: data.title ?? "",
				date: (data.date ?? "").toString(),
				description: data.description ?? "",
				location: data.location ?? "",
				tags: (data.tags ?? []).join(", "),
				hidden: !!data.hidden,
				layout: data.layout ?? "grid",
				columns: data.columns ?? 3,
				cover: data.cover ?? "",
				albumType:
					data.mode === "external" ? (isR2 ? "r2" : "external") : "local",
				photos: photos.map((src) => ({
					url: src,
					hidden: false,
					hiddenLabel: "",
				})),
			};
		} else if (type === "thought") {
			form = {
				...base,
				content: data.content ?? "",
				date: (data.date ?? "").toString(),
				context: data.context ?? "",
			};
		}
	}
});

function parseTags(value) {
	return String(value || "")
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean);
}

// 收集表单 → 纯函数所需的数据对象
function collectData() {
	switch (type) {
		case "post":
			return {
				title: form.title,
				published: form.published || getCurrentDate(),
				description: form.description,
				tags: parseTags(form.tags),
				category: form.category,
				content: form.content,
				draft: form.draft,
				pinned: form.pinned,
				useImage: form.useImage,
				image: form.image,
				usePassword: form.usePassword,
				password: form.password,
				useAuthor: form.useAuthor,
				author: form.author,
				useSource: form.useSource,
				sourceLink: form.sourceLink,
				useLicense: form.useLicense,
				licenseName: form.licenseName,
			};
		case "diary":
			return {
				title: form.title,
				date: form.date || getCurrentDateTime(),
				description: form.description,
				tags: parseTags(form.tags),
				content: form.content,
				images: form.images
					.map((item) =>
						item.hidden
							? `<Hide-${item.url.trim()}=${item.hiddenLabel || "隐藏图片"}>`
							: item.url.trim(),
					)
					.filter(Boolean),
				secret: form.secret,
				password: form.password,
				imageType: form.imageType,
				useImage: form.images.length > 0,
			};
		case "album":
			return {
				title: form.title,
				date: form.date || getCurrentDate(),
				description: form.description,
				location: form.location,
				tags: parseTags(form.tags),
				hidden: form.hidden,
				layout: form.layout,
				columns: Number(form.columns) || 3,
				cover: form.cover,
				albumType: form.albumType,
				photos: form.photos.map((item) => item.url.trim()).filter(Boolean),
			};
		case "thought":
			return {
				content: form.content,
				date: form.date || getCurrentDate(),
				context: form.context,
			};
	}
	return {};
}

// 实时预览
const result = $derived(generateMarkdown(type, collectData()));

// 编辑模式保留原文件名，确保是更新而非新建
const fileName = $derived(
	mode === "edit" && editing ? `${editing.slug}.md` : result.fileName,
);

function submit() {
	ongenerated?.({
		detail: { content: result.content, fileName, directory: result.directory },
	});
}

// R2 回填：整目录替换，单张追加
function fillImages(urls, append) {
	const wrapped = urls.map((url) => ({ url, hidden: false, hiddenLabel: "" }));
	if (append) {
		form.images = [...form.images, ...wrapped];
	} else {
		form.images = wrapped;
	}
}

function fillPhotos(urls, append) {
	const wrapped = urls.map((url) => ({ url, hidden: false, hiddenLabel: "" }));
	if (append) {
		form.photos = [...form.photos, ...wrapped];
	} else {
		form.photos = wrapped;
	}
}

// 从 R2 图片 URL 反推目录名：https://img.doulor.cn/diary/xxx/1.webp → xxx
function deriveDirectory(images) {
	const first = images.find((item) => item.url);
	if (!first) return "";
	try {
		const { pathname } = new URL(first.url);
		const parts = pathname.split("/").filter(Boolean); // ['diary','xxx','1.webp']
		if (parts.length < 2) return "";
		// 去掉类型前缀和末尾文件名，中间若干段拼回（如 diary/2026/xx 也兼容）
		return parts.slice(1, -1).join("/") || parts[1] || "";
	} catch {
		return "";
	}
}

const TYPE_LABELS = {
	post: "帖子",
	diary: "日记",
	album: "相册",
	thought: "碎碎念",
};
</script>

<div class="space-y-5">
  <div class="flex items-center justify-between gap-3">
    <h2 class="text-xl font-semibold text-90">
      {mode === 'edit' ? '编辑' : '新建'}{TYPE_LABELS[type]}
    </h2>
    <button type="button" class="btn-regular h-9 px-4 rounded-lg text-sm flex items-center" onclick={onback}>
      <Icon name="arrow-left" class="w-4 h-4 mr-2" />返回列表
    </button>
  </div>

  {#if type === 'post'}
    <label class="block">
      <span class="text-75 text-sm">标题 <span class="text-red-500">*</span></span>
      <input type="text" bind:value={form.title} required
        class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
    </label>

    <div class="grid sm:grid-cols-2 gap-4">
      <label class="block">
        <span class="text-75 text-sm">发布日期</span>
        <input type="date" bind:value={form.published}
          class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
      </label>
      <label class="block">
        <span class="text-75 text-sm">分类</span>
        <input type="text" bind:value={form.category} placeholder="如：创作 / 搬运 / wiki"
          class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
      </label>
    </div>

    <label class="block">
      <span class="text-75 text-sm">描述</span>
      <textarea bind:value={form.description} rows="2"
        class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"></textarea>
    </label>

    <label class="block">
      <span class="text-75 text-sm">标签（逗号分隔）</span>
      <input type="text" bind:value={form.tags} placeholder="如：AI, 工具"
        class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
    </label>

    <div class="flex flex-wrap gap-x-6 gap-y-2">
      <label class="flex items-center gap-2 text-sm text-75 cursor-pointer">
        <input type="checkbox" bind:checked={form.draft} class="accent-[var(--primary)]" /> 草稿
      </label>
      <label class="flex items-center gap-2 text-sm text-75 cursor-pointer">
        <input type="checkbox" bind:checked={form.pinned} class="accent-[var(--primary)]" /> 置顶
      </label>
      <label class="flex items-center gap-2 text-sm text-75 cursor-pointer">
        <input type="checkbox" bind:checked={form.useImage} class="accent-[var(--primary)]" /> 使用封面图片
      </label>
      <label class="flex items-center gap-2 text-sm text-75 cursor-pointer">
        <input type="checkbox" bind:checked={form.usePassword} class="accent-[var(--primary)]" /> 密码保护
      </label>
      <label class="flex items-center gap-2 text-sm text-75 cursor-pointer">
        <input type="checkbox" bind:checked={form.useAuthor} class="accent-[var(--primary)]" /> 自定义作者
      </label>
      <label class="flex items-center gap-2 text-sm text-75 cursor-pointer">
        <input type="checkbox" bind:checked={form.useSource} class="accent-[var(--primary)]" /> 来源链接
      </label>
      <label class="flex items-center gap-2 text-sm text-75 cursor-pointer">
        <input type="checkbox" bind:checked={form.useLicense} class="accent-[var(--primary)]" /> 许可证
      </label>
    </div>

    {#if form.useImage}
      <label class="block pl-1">
        <span class="text-50 text-xs">封面图片链接</span>
        <input type="text" bind:value={form.image} placeholder="https://... 或 /images/..."
          class="w-full mt-1 p-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
      </label>
    {/if}
    {#if form.usePassword}
      <label class="block pl-1">
        <span class="text-50 text-xs">访问密码</span>
        <input type="text" bind:value={form.password}
          class="w-full mt-1 p-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
      </label>
    {/if}
    {#if form.useAuthor}
      <label class="block pl-1">
        <span class="text-50 text-xs">作者</span>
        <input type="text" bind:value={form.author}
          class="w-full mt-1 p-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
      </label>
    {/if}
    {#if form.useSource}
      <label class="block pl-1">
        <span class="text-50 text-xs">来源链接</span>
        <input type="text" bind:value={form.sourceLink} placeholder="https://..."
          class="w-full mt-1 p-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
      </label>
    {/if}
    {#if form.useLicense}
      <label class="block pl-1">
        <span class="text-50 text-xs">许可证名称</span>
        <input type="text" bind:value={form.licenseName}
          class="w-full mt-1 p-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
      </label>
    {/if}

    <label class="block">
      <span class="text-75 text-sm">正文（Markdown）</span>
      <textarea bind:value={form.content} rows="8"
        class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"></textarea>
    </label>
  {:else if type === 'diary'}
    <label class="block">
      <span class="text-75 text-sm">标题 <span class="text-red-500">*</span></span>
      <input type="text" bind:value={form.title} required
        class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
    </label>

    <div class="grid sm:grid-cols-2 gap-4">
      <label class="block">
        <span class="text-75 text-sm">日期时间</span>
        <input type="datetime-local" bind:value={form.date}
          class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
      </label>
      <label class="block">
        <span class="text-75 text-sm">标签（逗号分隔）</span>
        <input type="text" bind:value={form.tags}
          class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
      </label>
    </div>

    <label class="block">
      <span class="text-75 text-sm">描述</span>
      <textarea bind:value={form.description} rows="2"
        class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"></textarea>
    </label>

    <div class="grid sm:grid-cols-2 gap-4">
      <label class="block">
        <span class="text-75 text-sm">隐藏密码（留空则自动）</span>
        <input type="text" bind:value={form.secret} placeholder="含隐藏内容时必填"
          class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
      </label>
      <label class="block">
        <span class="text-75 text-sm">独立访问密码（可选）</span>
        <input type="text" bind:value={form.password}
          class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
      </label>
    </div>

    <div>
      <span class="text-75 text-sm">图片来源</span>
      <div class="flex gap-4 mt-1">
        <label class="flex items-center gap-2 text-sm text-75 cursor-pointer">
          <input type="radio" value="local" bind:group={form.imageType} class="accent-[var(--primary)]" /> 本地媒体
        </label>
        <label class="flex items-center gap-2 text-sm text-75 cursor-pointer">
          <input type="radio" value="r2" bind:group={form.imageType} class="accent-[var(--primary)]" /> R2 存储
        </label>
      </div>
    </div>

    {#if form.imageType === 'r2'}
      <R2Panel
        prefix="diary"
        title="R2 日记图片"
        contentTitle={form.title}
        contentDate={form.date}
        initialDirectory={mode === 'edit' ? deriveDirectory(form.images) : ''}
        onimages={(urls, append) => fillImages(urls, append)}
      />
    {/if}

    <div>
      <span class="text-75 text-sm">图片（可拖拽排序，眼睛图标标记为隐藏）</span>
      <div class="mt-2">
        <ImageGrid bind:items={form.images} allowHidden />
      </div>
    </div>

    <label class="block">
      <span class="text-75 text-sm">正文（Markdown，可用 &lt;Hide-密码=说明&gt; 标记隐藏段落）</span>
      <textarea bind:value={form.content} rows="8"
        class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"></textarea>
    </label>
  {:else if type === 'album'}
    <label class="block">
      <span class="text-75 text-sm">相册标题 <span class="text-red-500">*</span></span>
      <input type="text" bind:value={form.title} required
        class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
    </label>

    <div class="grid sm:grid-cols-2 gap-4">
      <label class="block">
        <span class="text-75 text-sm">日期</span>
        <input type="date" bind:value={form.date}
          class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
      </label>
      <label class="block">
        <span class="text-75 text-sm">地点</span>
        <input type="text" bind:value={form.location}
          class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
      </label>
    </div>

    <label class="block">
      <span class="text-75 text-sm">描述</span>
      <textarea bind:value={form.description} rows="2"
        class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"></textarea>
    </label>

    <label class="block">
      <span class="text-75 text-sm">标签（逗号分隔）</span>
      <input type="text" bind:value={form.tags}
        class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
    </label>

    <div class="grid sm:grid-cols-3 gap-4">
      <label class="block">
        <span class="text-75 text-sm">布局</span>
        <select bind:value={form.layout}
          class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
          <option value="grid">网格布局</option>
          <option value="masonry">瀑布流布局</option>
        </select>
      </label>
      <label class="block">
        <span class="text-75 text-sm">列数</span>
        <input type="number" min="1" max="4" bind:value={form.columns}
          class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
      </label>
      <label class="flex items-end gap-2 pb-2 text-sm text-75 cursor-pointer">
        <input type="checkbox" bind:checked={form.hidden} class="accent-[var(--primary)]" /> 隐藏相册
      </label>
    </div>

    <label class="block">
      <span class="text-75 text-sm">封面图片（留空且为外部/R2 相册时自动取第一张）</span>
      <input type="text" bind:value={form.cover} placeholder="https://..."
        class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
    </label>

    <div>
      <span class="text-75 text-sm">相册类型</span>
      <div class="grid grid-cols-3 gap-3 mt-1">
        <label class="flex items-center gap-2 p-3 border border-black/10 dark:border-white/10 rounded-lg cursor-pointer text-sm text-75 {form.albumType === 'local' ? 'ring-2 ring-[var(--primary)]' : ''}">
          <input type="radio" value="local" bind:group={form.albumType} class="accent-[var(--primary)]" /> 本地相册
        </label>
        <label class="flex items-center gap-2 p-3 border border-black/10 dark:border-white/10 rounded-lg cursor-pointer text-sm text-75 {form.albumType === 'external' ? 'ring-2 ring-[var(--primary)]' : ''}">
          <input type="radio" value="external" bind:group={form.albumType} class="accent-[var(--primary)]" /> 外部链接
        </label>
        <label class="flex items-center gap-2 p-3 border border-black/10 dark:border-white/10 rounded-lg cursor-pointer text-sm text-75 {form.albumType === 'r2' ? 'ring-2 ring-[var(--primary)]' : ''}">
          <input type="radio" value="r2" bind:group={form.albumType} class="accent-[var(--primary)]" /> R2 相册
        </label>
      </div>
    </div>

    {#if form.albumType === 'r2'}
      <R2Panel
        prefix="album"
        title="R2 相册图片"
        contentTitle={form.title}
        contentDate={form.date}
        initialDirectory={mode === 'edit' ? deriveDirectory(form.photos) : ''}
        onimages={(urls, append) => fillPhotos(urls, append)}
      />
    {/if}

    {#if form.albumType === 'external' || form.albumType === 'r2'}
      <div>
        <span class="text-75 text-sm">相册图片（可拖拽排序）</span>
        <div class="mt-2">
          <ImageGrid bind:items={form.photos} />
        </div>
      </div>
    {/if}
  {:else if type === 'thought'}
    <label class="block">
      <span class="text-75 text-sm">内容 <span class="text-red-500">*</span></span>
      <textarea bind:value={form.content} rows="3" required
        class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"></textarea>
    </label>

    <div class="grid sm:grid-cols-2 gap-4">
      <label class="block">
        <span class="text-75 text-sm">日期</span>
        <input type="date" bind:value={form.date}
          class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
      </label>
      <label class="block">
        <span class="text-75 text-sm">上下文 / 备注</span>
        <input type="text" bind:value={form.context}
          class="w-full mt-1 p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
      </label>
    </div>
  {/if}

  <!-- 实时预览 -->
  <div class="space-y-2">
    <span class="text-75 text-sm">预览：<span class="font-mono text-xs">{fileName}</span></span>
    <pre class="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-xs font-mono text-75 whitespace-pre-wrap break-all max-h-72 overflow-auto">{result.content}</pre>
  </div>

  <button
    type="button"
    class="w-full h-12 rounded-lg text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 transition-all font-medium flex items-center justify-center"
    onclick={submit}
  >
    <Icon name="github" class="w-4 h-4 mr-2" />
    {mode === 'edit' ? '提交更新到 GitHub' : '提交到 GitHub'}
  </button>
</div>
