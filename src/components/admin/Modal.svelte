<script>
// 通用弹窗：ESC 关闭、点击遮罩关闭，替 auth/submit/delete 三个重复的模态框
//
// 用 portal 挂到 document.body 而不是留在组件树里：布局的 #content-wrapper
// 带 onload-animation（fill:forwards 保留 transform），任何 transform 祖先
// 都会成为 fixed 后代的包含块，弹窗会相对页面顶部定位，滚下去就看不到。
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

// 把节点搬到 body 下，离开所有 transform 祖先
function portal(node) {
	document.body.appendChild(node);
	// 弹窗已固定在视口顶部；页面停在长表单底部时，把视图滚回弹窗所在高度
	node.scrollIntoView({ block: "start", behavior: "smooth" });
	return {
		destroy() {
			node.remove();
		},
	};
}
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
  <div
    use:portal
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
