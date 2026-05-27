import CryptoJS from "crypto-js";

const MARKER_START = "<Hide-";
const HIDDEN_FALLBACK_LABEL = "已隐藏内容";

export function splitDiaryHiddenMarkers(input) {
	const value = String(input ?? "");
	const parts = [];
	let cursor = 0;

	while (cursor < value.length) {
		const start = value.indexOf(MARKER_START, cursor);
		if (start === -1) {
			parts.push({ type: "text", value: value.slice(cursor) });
			break;
		}

		if (start > cursor) {
			parts.push({ type: "text", value: value.slice(cursor, start) });
		}

		const end = value.indexOf(">", start + MARKER_START.length);
		if (end === -1) {
			parts.push({ type: "text", value: value.slice(start) });
			break;
		}

		const markerBody = value.slice(start + MARKER_START.length, end);
		const separator = markerBody.lastIndexOf("=");
		if (separator <= 0) {
			parts.push({ type: "text", value: value.slice(start, end + 1) });
			cursor = end + 1;
			continue;
		}

		const hiddenValue = markerBody.slice(0, separator).trim();
		const label = markerBody.slice(separator + 1).trim() || HIDDEN_FALLBACK_LABEL;
		if (!hiddenValue) {
			parts.push({ type: "text", value: value.slice(start, end + 1) });
			cursor = end + 1;
			continue;
		}

		parts.push({ type: "hidden", value: hiddenValue, label });
		cursor = end + 1;
	}

	return parts.filter((part) => part.value !== "");
}

export function hasDiaryHiddenMarkers(input) {
	return splitDiaryHiddenMarkers(input).some((part) => part.type === "hidden");
}

export function sanitizeDiaryHiddenMarkers(input) {
	return splitDiaryHiddenMarkers(input)
		.map((part) => (part.type === "hidden" ? part.label : part.value))
		.join("");
}

export function getSingleDiaryHiddenMarker(input) {
	const parts = splitDiaryHiddenMarkers(input);
	const hiddenParts = parts.filter((part) => part.type === "hidden");
	if (hiddenParts.length !== 1) return null;
	const onlyMarker = parts.every(
		(part) => part.type === "hidden" || String(part.value).trim() === "",
	);
	return onlyMarker ? hiddenParts[0] : null;
}

export function normalizeDiaryMediaValue(input) {
	const value = String(input ?? "").trim();
	const markdownLink = value.match(/\(([^)]+)\)/);
	return markdownLink ? markdownLink[1].trim() : value;
}

export function isDiaryImageUrl(input) {
	return /\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?|#|$)/i.test(
		normalizeDiaryMediaValue(input),
	);
}

export function isExternalDiaryUrl(input) {
	try {
		const parsed = new URL(normalizeDiaryMediaValue(input));
		return /^https?:$/.test(parsed.protocol);
	} catch {
		return false;
	}
}

export function joinDiaryUrl(basePath, value) {
	const normalizedValue = String(value ?? "").replace(/\\/g, "/");
	if (!basePath) return normalizedValue;
	return `${String(basePath).replace(/\\/g, "/").replace(/\/+$/, "")}/${normalizedValue.replace(/^\/+/, "")}`;
}

export function resolveDiaryMediaSrc(input, basePath = "") {
	const normalized = normalizeDiaryMediaValue(input);
	if (/^(https?:|data:|blob:|\/)/i.test(normalized)) return normalized;
	return joinDiaryUrl(basePath, normalized);
}

export function createDiaryHiddenPayload(value, secret, kind) {
	if (!secret) return "";
	return CryptoJS.AES.encrypt(
		JSON.stringify({
			__diaryHidden: true,
			kind,
			value,
		}),
		String(secret),
	).toString();
}

export function escapeHtml(input) {
	return String(input ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}
