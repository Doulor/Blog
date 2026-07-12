<script lang="ts">
import { onMount } from "svelte";
import Icon from "@iconify/svelte";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getFont, setFont, type FontOption } from "@utils/setting-utils";

interface FontItem {
	id: FontOption;
	name: string;
	github?: string;
}

const fonts: FontItem[] = [
	{ id: "default", name: "圆体 (默认)" },
	{ id: "smiley-sans", name: "得意黑", github: "https://github.com/atelier-anchor/smiley-sans" },
	{ id: "lxgw-wenkai", name: "霞鹜文楷", github: "https://github.com/lxgw/LxgwWenKai" },
];

let currentFont: FontOption = $state("default");
let panelOpen = $state(false);
let panelEl: HTMLElement;

onMount(() => {
	currentFont = getFont();

	function handleClickOutside(e: MouseEvent) {
		if (panelEl && !panelEl.contains(e.target as Node)) {
			panelOpen = false;
		}
	}
	document.addEventListener("click", handleClickOutside);
	return () => document.removeEventListener("click", handleClickOutside);
});

function togglePanel() {
	panelOpen = !panelOpen;
}

function selectFont(font: FontOption) {
	currentFont = font;
	setFont(font);
	panelOpen = false;
}

function getFontDisplayName(id: FontOption): string {
	return fonts.find(f => f.id === id)?.name || "默认";
}
</script>

<div class="relative" bind:this={panelEl}>
	<button
		aria-label={i18n(I18nKey.font)}
		class="btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90 flex items-center justify-center"
		on:click={togglePanel}
		title="{i18n(I18nKey.font)}: {getFontDisplayName(currentFont)}"
	>
		<Icon icon="material-symbols:font-download-outline" class="text-[1.25rem]"></Icon>
	</button>

	{#if panelOpen}
		<div class="float-panel absolute transition-all w-64 right-0 mt-2 px-4 py-4 z-50">
			<div class="flex flex-row gap-2 mb-3 items-center">
				<div class="flex gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100 transition relative ml-3
					before:w-1 before:h-4 before:rounded-md before:bg-[var(--primary)]
					before:absolute before:-left-3 before:top-[0.33rem]"
				>
					{i18n(I18nKey.font)}
				</div>
			</div>

			<div class="flex flex-col gap-1.5">
				{#each fonts as font}
					<button
						class="flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all
							{currentFont === font.id
								? 'bg-[var(--primary)] text-white font-medium'
								: 'text-neutral-700 dark:text-neutral-300 hover:bg-[var(--btn-plain-bg-hover)]'}"
						on:click={() => selectFont(font.id)}
					>
						<span class="flex flex-col items-start">
							<span>{font.name}</span>
							{#if font.github}
								<a
									href={font.github}
									target="_blank"
									rel="noopener noreferrer"
									class="text-[0.65rem] opacity-60 hover:opacity-100 hover:underline mt-0.5"
									on:click|stopPropagation
								>
									GitHub
								</a>
							{/if}
						</span>
						{#if currentFont === font.id}
							<Icon icon="material-symbols:check" class="text-[1rem]"></Icon>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.float-panel {
		background: var(--card-bg);
		border: 1px solid var(--line-divider);
		border-radius: 0.75rem;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
	}
	:root.dark .float-panel {
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
	}
</style>
