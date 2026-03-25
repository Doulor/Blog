/**
 * useTocHighlight - TOC 高亮计算
 */

export function calculateActiveHeadingRange(activeStates: boolean[]): {
	min: number;
	max: number;
} {
	let min = activeStates.length - 1;
	let max = -1;

	for (let i = activeStates.length - 1; i >= 0; i--) {
		if (activeStates[i]) {
			min = Math.min(min, i);
			max = Math.max(max, i);
		}
	}

	return { min, max };
}

export function isInRange(value: number, min: number, max: number): boolean {
	return min < value && value < max;
}
