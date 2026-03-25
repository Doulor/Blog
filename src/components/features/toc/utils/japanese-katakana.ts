/**
 * 日语片假名字符集
 * 用于 TOC 徽章显示
 */

export const JAPANESE_KATAKANA = [
	"ア",
	"イ",
	"ウ",
	"エ",
	"オ",
	"カ",
	"キ",
	"ク",
	"ケ",
	"コ",
	"サ",
	"シ",
	"ス",
	"セ",
	"ソ",
	"タ",
	"チ",
	"ツ",
	"テ",
	"ト",
	"ナ",
	"ニ",
	"ヌ",
	"ネ",
	"ノ",
	"ハ",
	"ヒ",
	"フ",
	"ヘ",
	"ホ",
	"マ",
	"ミ",
	"ム",
	"メ",
	"モ",
	"ヤ",
	"ユ",
	"ヨ",
	"ラ",
	"リ",
	"ル",
	"レ",
	"ロ",
	"ワ",
	"ヲ",
	"ン",
] as const;

export type JapaneseKatakanaChar = (typeof JAPANESE_KATAKANA)[number];

export function getKatakanaBadge(index: number, useJapanese: boolean): string {
	if (useJapanese && index < JAPANESE_KATAKANA.length) {
		return JAPANESE_KATAKANA[index];
	}
	return (index + 1).toString();
}

export const KATAKANA_COUNT = JAPANESE_KATAKANA.length;
