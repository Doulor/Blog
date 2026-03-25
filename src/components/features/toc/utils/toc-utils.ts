/**
 * TOC 组件共享工具函数
 */

import type { HeadingData, TOCConfig, TOCItem } from "../types";
import { getKatakanaBadge } from "./japanese-katakana";

export function extractHeadings(
	containerSelector = "#post-container",
): HeadingData[] {
	const container = document.querySelector(containerSelector);
	if (!container) {
		return [];
	}

	const headings = container.querySelectorAll(
		"h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]",
	);
	return Array.from(headings).map((h) => ({
		id: h.id,
		text: (h.textContent || "").replace(/#+\s*$/, ""),
		level: parseInt(h.tagName[1]),
	}));
}

export function getMinLevel(headings: HeadingData[]): number {
	if (headings.length === 0) {
		return 1;
	}
	return Math.min(...headings.map((h) => h.level));
}

export function generateTOCItems(
	headings: HeadingData[],
	config: TOCConfig,
): TOCItem[] {
	if (headings.length === 0) {
		return [];
	}

	const minLevel = getMinLevel(headings);
	const maxDepth = config.depth;

	let h1Count = 0;

	return headings
		.filter((h) => h.level < minLevel + maxDepth)
		.map((h) => {
			const depth = h.level - minLevel;
			let badge: string | undefined;

			if (h.level === minLevel) {
				badge = getKatakanaBadge(h1Count, config.useJapaneseBadge);
				h1Count++;
			}

			return {
				id: h.id,
				text: h.text,
				level: h.level,
				depth,
				badge,
			};
		});
}

export function scrollToHeading(id: string, offset = 80): void {
	const element = document.getElementById(id);
	if (!element) {
		return;
	}

	const targetTop =
		element.getBoundingClientRect().top + window.scrollY - offset;
	window.scrollTo({
		top: targetTop,
		behavior: "smooth",
	});
}

export function getTOCConfig(): TOCConfig {
	const siteConfig = (window as unknown as { siteConfig?: any }).siteConfig || {};
	return {
		enable: siteConfig.toc?.enable ?? true,
		mode: siteConfig.toc?.mode ?? "sidebar",
		depth: siteConfig.toc?.depth ?? 3,
		useJapaneseBadge: siteConfig.toc?.useJapaneseBadge ?? false,
	};
}
