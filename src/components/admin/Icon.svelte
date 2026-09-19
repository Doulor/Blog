<script>
// 内联 SVG 图标（feather 风格 stroke，github 为 fill）。
// 管理台页面不加载 FontAwesome，统一用这里，currentColor 自适应明暗主题。
let { name, class: cls = "w-4 h-4" } = $props();

// stroke 图标：24x24 viewBox，stroke-width 2，round linecap/linejoin
const STROKE = {
	x: '<path d="M18 6 6 18M6 6l12 12"/>',
	check: '<path d="M20 6 9 17l-5-5"/>',
	grip: '<circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/>',
	eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
	"eye-off":
		'<path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.4 0 10 7 10 7a18.4 18.4 0 0 1-2.2 3M6.6 6.6A18.5 18.5 0 0 0 2 11s3.6 7 10 7a10.9 10.9 0 0 0 5.4-1.5M14.1 14.1a3 3 0 0 1-4.2-4.2M2 2l20 20"/>',
	plus: '<path d="M12 5v14M5 12h14"/>',
	upload:
		'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
	image:
		'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
	refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
	cloud:
		'<path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6 1.8A3.8 3.8 0 0 0 6.5 19Z"/>',
	"arrow-left": '<path d="M19 12H5M12 19l-7-7 7-7"/>',
	loader:
		'<path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
};

const FILL = {
	github:
		'<path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.3-1.8-1.3-1.8-1.1-.7 0-.7 0-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1a2.7 2.7 0 0 1 .8-1.7c-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.1-.3-.6-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.6.2 2.9.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z"/>',
};

const isFill = name in FILL;
</script>

{#if isFill}
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class={cls} aria-hidden="true">
    {@html FILL[name]}
  </svg>
{:else}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={cls}
    aria-hidden="true"
  >
    {@html STROKE[name]}
  </svg>
{/if}
