/**
 * useTocScroll - TOC 滚动同步
 */

export function calculateActiveIndicatorPosition(
	container: HTMLElement,
	minEntry: HTMLElement,
	maxEntry: HTMLElement,
): { top: number; height: number } {
	const containerRect = container.getBoundingClientRect();
	const minRect = minEntry.getBoundingClientRect();
	const maxRect = maxEntry.getBoundingClientRect();

	const top = minRect.top - containerRect.top + container.scrollTop;
	const height = maxRect.bottom - minRect.top;

	return { top, height };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
	fn: T,
	limit: number,
): (...args: Parameters<T>) => void {
	let inThrottle = false;
	return (...args: Parameters<T>) => {
		if (!inThrottle) {
			fn(...args);
			inThrottle = true;
			setTimeout(() => {
				inThrottle = false;
			}, limit);
		}
	};
}
