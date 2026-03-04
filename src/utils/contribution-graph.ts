export type ContributionKind = "post" | "diary" | "album";

export type ContributionItem = {
	kind: ContributionKind;
	date: Date;
	slug?: string;
	title?: string;
};

export type ContributionDay = {
	date: Date;
	iso: string; // YYYY-MM-DD
	weekday: number; // 0..6 (Sun..Sat)
	count: number;
	kinds: Partial<Record<ContributionKind, number>>;
	level: 0 | 1 | 2 | 3 | 4;
};

export type ContributionGraphData = {
	from: Date;
	to: Date;
	days: ContributionDay[];
	weeks: ContributionDay[][]; // columns
	totals: {
		count: number;
		posts: number;
		diaries: number;
		albums: number;
	};
};

function toISODate(d: Date): string {
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

function startOfDay(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
	const nd = new Date(d);
	nd.setDate(nd.getDate() + n);
	return nd;
}

function clampToLastYearRange(to: Date, dayCount: number): { from: Date; to: Date } {
	const end = startOfDay(to);
	const start = addDays(end, -(dayCount - 1));
	return { from: start, to: end };
}

function computeLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
	if (count <= 0) return 0;
	if (max <= 1) return 4;
	const ratio = count / max;
	if (ratio <= 0.25) return 1;
	if (ratio <= 0.5) return 2;
	if (ratio <= 0.75) return 3;
	return 4;
}

export function buildContributionGraph(
	items: ContributionItem[],
	options?: {
		to?: Date;
		days?: number; // default 365
		weekStart?: 0 | 1; // 0=Sun, 1=Mon. default 0 (GitHub 风格)
	},
): ContributionGraphData {
	const to = options?.to ?? new Date();
	const days = options?.days ?? 365;
	const weekStart = options?.weekStart ?? 0;

	const { from, to: end } = clampToLastYearRange(to, days);

	// normalize items into map
	const map = new Map<string, ContributionDay>();
	for (let i = 0; i < days; i++) {
		const date = addDays(from, i);
		const iso = toISODate(date);
		map.set(iso, {
			date,
			iso,
			weekday: date.getDay(),
			count: 0,
			kinds: {},
			level: 0,
		});
	}

	let totalsPost = 0;
	let totalsDiary = 0;
	let totalsAlbum = 0;

	for (const it of items) {
		const d = startOfDay(it.date);
		if (d < from || d > end) continue;
		const iso = toISODate(d);
		const day = map.get(iso);
		if (!day) continue;
		day.count += 1;
		day.kinds[it.kind] = (day.kinds[it.kind] ?? 0) + 1;
		if (it.kind === "post") totalsPost++;
		if (it.kind === "diary") totalsDiary++;
		if (it.kind === "album") totalsAlbum++;
	}

	const daysArr = Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
	const max = daysArr.reduce((m, d) => Math.max(m, d.count), 0);
	for (const d of daysArr) d.level = computeLevel(d.count, max);

	// build weeks columns like GitHub
	// pad start to week boundary
	const padLeft = (7 + ((daysArr[0].weekday - weekStart) % 7)) % 7;
	const padded: (ContributionDay | null)[] = [];
	for (let i = 0; i < padLeft; i++) padded.push(null);
	padded.push(...daysArr);
	// pad right to complete last week
	while (padded.length % 7 !== 0) padded.push(null);

	const weeks: ContributionDay[][] = [];
	for (let i = 0; i < padded.length; i += 7) {
		const col: ContributionDay[] = [];
		for (let j = 0; j < 7; j++) {
			const v = padded[i + j];
			if (v) col.push(v);
		}
		weeks.push(col);
	}

	return {
		from,
		to: end,
		days: daysArr,
		weeks,
		totals: {
			count: totalsPost + totalsDiary + totalsAlbum,
			posts: totalsPost,
			diaries: totalsDiary,
			albums: totalsAlbum,
		},
	};
}
