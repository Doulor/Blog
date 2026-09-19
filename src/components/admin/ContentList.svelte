<script>
// 内容列表：搜索 + 类型筛选 + 编辑/删除
const TYPE_LABELS = {
	all: "全部",
	post: "帖子",
	diary: "日记",
	album: "相册",
	thought: "碎碎念",
};
const TYPE_ORDER = ["all", "post", "diary", "album", "thought"];

let { items = [], onedit, ondelete } = $props();

let filter = $state("all");
let keyword = $state("");

const counts = $derived(
	Object.fromEntries(
		TYPE_ORDER.map((type) => [
			type,
			type === "all"
				? items.length
				: items.filter((item) => item.type === type).length,
		]),
	),
);

const visible = $derived(
	items.filter((item) => {
		if (filter !== "all" && item.type !== filter) return false;
		if (!keyword.trim()) return true;
		const haystack = [
			item.title,
			item.description,
			(item.tags || []).join(" "),
			item.category,
			item.location,
		]
			.join(" ")
			.toLowerCase();
		return haystack.includes(keyword.trim().toLowerCase());
	}),
);

function formatDate(value) {
	if (!value) return "";
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? value
		: date.toLocaleDateString("zh-CN");
}
</script>

<div class="space-y-4">
  <div class="flex items-center gap-2 flex-wrap">
    {#each TYPE_ORDER as type}
      <button
        type="button"
        class="btn-card h-9 px-3.5 rounded-lg text-sm {filter === type ? 'text-[var(--primary)]' : ''}"
        onclick={() => (filter = type)}
      >
        {TYPE_LABELS[type]}
        <span class="ml-1.5 text-xs opacity-60">{counts[type]}</span>
      </button>
    {/each}
  </div>

  <input
    type="search"
    placeholder="搜索标题、描述或标签..."
    bind:value={keyword}
    class="w-full p-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
  />

  {#if visible.length === 0}
    <p class="text-50 text-sm py-8 text-center">没有匹配的内容</p>
  {/if}

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    {#each visible as item (item.type + item.slug)}
      <article
        class="group card-base rounded-xl p-4 flex flex-col gap-2 hover:shadow-md transition-shadow"
      >
        <div class="flex items-start justify-between gap-3">
          <h3 class="font-semibold text-90 line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
            {#if item.type === 'thought'}
              “{item.title}”
            {:else}
              {item.title || '未命名'}
            {/if}
          </h3>
          <div class="flex gap-1.5 shrink-0">
            <button
              type="button"
              class="btn-regular h-8 px-3 rounded-lg text-xs"
              onclick={() => onedit?.({ detail: { type: item.type, slug: item.slug } })}
            >
              编辑
            </button>
            <button
              type="button"
              class="h-8 px-3 rounded-lg text-xs text-white bg-red-500 hover:bg-red-600 transition-colors"
              onclick={() => ondelete?.({ detail: { type: item.type, slug: item.slug, title: item.title } })}
            >
              删除
            </button>
          </div>
        </div>

        {#if item.description}
          <p class="text-75 text-sm line-clamp-2">{item.description}</p>
        {/if}

        <div class="flex items-center gap-3 text-xs text-50 flex-wrap">
          <span class="btn-regular h-6 px-2 rounded-lg">{TYPE_LABELS[item.type]}</span>
          {#if item.category}
            <span class="btn-regular h-6 px-2 rounded-lg">{item.category}</span>
          {/if}
          {#if item.pinned}
            <span class="text-[var(--primary)]">置顶</span>
          {/if}
          {#if item.draft}
            <span class="text-amber-500">草稿</span>
          {/if}
          {#if item.photoCount}
            <span>{item.photoCount} 张照片</span>
          {/if}
          {#if item.location}
            <span>{item.location}</span>
          {/if}
          <span class="ml-auto">{formatDate(item.date)}</span>
        </div>

        {#if item.tags && item.tags.length > 0}
          <div class="flex flex-wrap gap-1">
            {#each item.tags.slice(0, 4) as tag}
              <span class="btn-regular h-6 px-2 rounded-lg text-xs">{tag}</span>
            {/each}
            {#if item.tags.length > 4}
              <span class="btn-regular h-6 px-2 rounded-lg text-xs">+{item.tags.length - 4}</span>
            {/if}
          </div>
        {/if}
      </article>
    {/each}
  </div>
</div>
