/**
 * TOC 组件共享类型定义
 */

export interface TOCItem {
	id: string;
	text: string;
	level: number;
	depth: number;
	badge?: string;
}

export interface TOCConfig {
	enable: boolean;
	mode: "float" | "sidebar";
	depth: number;
	useJapaneseBadge: boolean;
}

export interface HeadingData {
	id: string;
	text: string;
	level: number;
}
