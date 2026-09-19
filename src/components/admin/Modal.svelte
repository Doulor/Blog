<script>
// 通用弹窗：ESC 关闭、点击遮罩关闭，替 auth/submit/delete 三个重复的模态框
import { fade, scale } from "svelte/transition";

let {
	open = $bindable(false),
	title = "",
	width = "max-w-md",
	onClose = () => {},
	children,
} = $props();

function close() {
	open = false;
	onClose();
}

function onKeydown(event) {
	if (event.key === "Escape" && open) close();
}
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
  <div
    class="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm"
    transition:fade={{ duration: 150 }}
    onclick={(event) => {
      if (event.target === event.currentTarget) close();
    }}
    role="presentation"
  >
    <div
      class="card-base w-full {width} mt-16 rounded-2xl p-6 shadow-2xl"
      transition:scale={{ duration: 200, start: 0.95, opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {#if title}
        <h2 class="text-lg font-semibold text-90 mb-4">{title}</h2>
      {/if}
      {@render children?.()}
    </div>
  </div>
{/if}
