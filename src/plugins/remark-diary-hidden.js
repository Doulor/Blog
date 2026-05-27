import { visit } from "unist-util-visit";
import {
	createDiaryHiddenPayload,
	getSingleDiaryHiddenMarker,
	isDiaryImageUrl,
	splitDiaryHiddenMarkers,
} from "../utils/diary-hidden.js";

function getFrontmatterSecret(file) {
	return String(file?.data?.astro?.frontmatter?.secret ?? "");
}

function createHiddenNode(marker, secret) {
	const kind = isDiaryImageUrl(marker.value) ? "image" : "text";
	const encryptedPayload = createDiaryHiddenPayload(marker.value, secret, kind);
	const className = ["diary-hidden-trigger"];
	className.push(kind === "image" ? "diary-hidden-image-inline" : "diary-hidden-token");

	return {
		type: "emphasis",
		data: {
			hName: "button",
			hProperties: {
				type: "button",
				className,
				"data-diary-hidden-kind": kind,
				"data-diary-hidden-label": marker.label,
				"data-diary-hidden-payload": encryptedPayload,
				"data-pagefind-ignore": "true",
				"aria-label": `隐藏内容：${marker.label}`,
				"aria-pressed": "false",
			},
		},
		children: [{ type: "text", value: marker.label }],
	};
}

function splitTextNode(node, secret) {
	const parts = splitDiaryHiddenMarkers(node.value);
	if (!parts.some((part) => part.type === "hidden")) return null;

	return parts.map((part) =>
		part.type === "hidden"
			? createHiddenNode(part, secret)
			: { type: "text", value: part.value },
	);
}

function markerFromLinkNode(node) {
	const linkText = (node.children || [])
		.map((child) => (child.type === "text" ? child.value : ""))
		.join("");
	const candidate = linkText.startsWith("Hide-")
		? `<${linkText}>`
		: String(node.url || "").startsWith("Hide-")
			? `<${decodeURIComponent(node.url)}>`
			: "";
	return candidate ? getSingleDiaryHiddenMarker(candidate) : null;
}

export function remarkDiaryHidden() {
	return (tree, file) => {
		const secret = getFrontmatterSecret(file);

		visit(tree, (node, index, parent) => {
			if (!parent || typeof index !== "number" || !Array.isArray(parent.children)) {
				return;
			}

			if (node.type === "text") {
				const replacement = splitTextNode(node, secret);
				if (replacement) parent.children.splice(index, 1, ...replacement);
				return;
			}

			if (node.type === "link" || node.type === "image") {
				const marker = markerFromLinkNode(node);
				if (marker) parent.children.splice(index, 1, createHiddenNode(marker, secret));
			}
		});
	};
}
