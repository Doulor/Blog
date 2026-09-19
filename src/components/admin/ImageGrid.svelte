<script>
// 图片网格：缩略图 + mizuki-lightbox 预览 + 拖拽排序 + 增删 + 日记隐藏标记
import {
	createDiaryHiddenMarker,
	parseSingleDiaryHiddenMarker,
} from "../../scripts/admin/markdown.js";
import Icon from "./Icon.svelte";

let {
	items = $bindable([]),
	allowHidden = false, // 日记图片允许标记为隐藏
	addable = true,
	onadd,
} = $props();

// items: [{ url, hidden, hiddenLabel }]

let dragIndex = $state(null);

function add() {
	if (onadd) {
		onadd();
		return;
	}
	items.push({ url: "", hidden: false, hiddenLabel: "" });
}

function remove(index) {
	items.splice(index, 1);
}

function toggleHidden(index) {
	items[index].hidden = !items[index].hidden;
	items = [...items];
}

// ---- 拖拽排序（drag-handle 激活，兼容触摸） ----
function onDragStart(event, index) {
	dragIndex = index;
	event.dataTransfer?.setData("text/plain", String(index));
}

function onDragOver(event, index) {
	if (dragIndex === null || dragIndex === index) return;
	event.preventDefault();
	const from = dragIndex;
	const [moved] = items.splice(from, 1);
	items.splice(index, 0, moved);
	dragIndex = index;
	items = [...items];
}

function onDragEnd() {
	dragIndex = null;
}

// 键盘可访问的移动
function move(index, delta) {
	const target = index + delta;
	if (target < 0 || target >= items.length) return;
	const [moved] = items.splice(index, 1);
	items.splice(target, 0, moved);
	items = [...items];
}

function displayUrl(item) {
	// 隐藏标记形如 <Hide-value=label>，预览时取其中的真实值
	if (!allowHidden) return item.url;
	const marker = parseSingleDiaryHiddenMarker(item.url);
	return marker ? marker.value : item.url;
}
</script>

<div class="space-y-3">
  {#if items.length > 0}
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {#each items as item, index (index)}
        {@const url = displayUrl(item)}
        <div
          class="group relative card-base rounded-lg overflow-hidden {dragIndex === index ? 'opacity-40' : ''}"
          draggable="true"
          ondragstart={(event) => onDragStart(event, index)}
          ondragover={(event) => onDragOver(event, index)}
          ondrop={onDragEnd}
          ondragend={onDragEnd}
        >
          {#if url}
            <div
              class="aspect-square cursor-zoom-in"
              data-lightbox-src={url}
              data-lightbox-caption={item.hiddenLabel || ''}
            >
              <img src={url} alt={item.hiddenLabel || '图片'} class="w-full h-full object-cover" loading="lazy" />
            </div>
          {:else}
            <div class="aspect-square flex items-center justify-center text-50 text-xs p-2 text-center">
              未填写链接
            </div>
          {/if}

          <div class="p-1.5 space-y-1.5">
            <input
              type="text"
              bind:value={item.url}
              placeholder="图片链接"
              class="w-full p-1.5 text-xs rounded border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
            {#if allowHidden && item.hidden}
              <input
                type="text"
                bind:value={item.hiddenLabel}
                placeholder="隐藏图片的公开说明"
                class="w-full p-1.5 text-xs rounded border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-90 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            {/if}
          </div>

          <!-- 操作按钮 -->
          <div class="absolute top-1.5 right-1.5 flex gap-1 opacity-60 hover:opacity-100 transition-opacity">
            {#if allowHidden}
              <button
                type="button"
                title={item.hidden ? '取消隐藏标记' : '标记为隐藏内容'}
                class="w-7 h-7 rounded-md flex items-center justify-center {item.hidden ? 'bg-amber-500 text-white' : 'bg-white/90 dark:bg-neutral-800/90 text-75'}"
                onclick={() => toggleHidden(index)}
                aria-label="切换隐藏标记"
              >
                <Icon name={item.hidden ? 'eye-off' : 'eye'} class="w-3.5 h-3.5" />
              </button>
            {/if}
            <button
              type="button"
              title="删除图片"
              class="w-7 h-7 rounded-md flex items-center justify-center bg-white/90 dark:bg-neutral-800/90 text-red-500 hover:bg-red-500 hover:text-white"
              onclick={() => remove(index)}
              aria-label="删除图片"
            >
              <Icon name="x" class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- 拖拽手柄 + 序号 -->
          <div class="absolute top-1.5 left-1.5 flex items-center gap-1">
            <button
              type="button"
              class="drag-handle w-7 h-7 rounded-md flex items-center justify-center bg-white/90 dark:bg-neutral-800/90 text-50 cursor-grab active:cursor-grabbing"
              title="拖拽排序（或用箭头键移动）"
              aria-label="拖拽排序"
              onkeydown={(event) => {
                if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                  event.preventDefault();
                  move(index, -1);
                } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                  event.preventDefault();
                  move(index, 1);
                }
              }}
            >
              <Icon name="grip" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if addable}
    <button
      type="button"
      class="text-sm bg-[var(--secondary)]/20 hover:bg-[var(--secondary)] text-[var(--secondary)] hover:text-white px-4 py-2 rounded-lg transition-colors flex items-center border border-[var(--secondary)]/30 hover:border-[var(--secondary)]"
      onclick={add}
    >
      <Icon name="plus" class="w-4 h-4 mr-2" /> 添加图片
    </button>
  {/if}
</div>

<style>
  .drag-handle {
    touch-action: none;
  }
</style>
