/**
 * Markdown / frontmatter 生成与解析（纯函数，不碰 DOM）
 *
 * 生成结果与本仓库既有内容文件格式保持一致：
 *   post    → src/content/posts/xxx.md    （published 为裸日期）
 *   diary   → src/content/diary/xxx.md    （date 为 "YYYY-MM-DD HH:mm"）
 *   album   → src/content/albums/xxx.md   （photos: [{ src }] 块）
 *   thought → src/content/thoughts/xxx.md
 */

/** YAML 双引号字符串转义，避免含 " 的标题/描述破坏 frontmatter */
export function escapeYaml(str) {
	if (typeof str !== "string") return str;
	return str
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\n/g, "\\n")
		.replace(/\r/g, "\\r")
		.replace(/\t/g, "\\t");
}

/** HTML 属性转义（渲染到 DOM 时使用） */
export function escapeAttribute(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

// ============ 日记隐藏图片标记 <Hide-value=label> ============

export function sanitizeDiaryHiddenMarkerPart(value) {
	return String(value ?? "")
		.trim()
		.replace(/>/g, "");
}

export function createDiaryHiddenMarker(hiddenValue, label) {
	const safeHiddenValue = sanitizeDiaryHiddenMarkerPart(hiddenValue);
	const safeLabel = sanitizeDiaryHiddenMarkerPart(label) || "已隐藏内容";
	return safeHiddenValue ? `<Hide-${safeHiddenValue}=${safeLabel}>` : "";
}

export function parseSingleDiaryHiddenMarker(value) {
	const text = String(value ?? "").trim();
	if (!text.startsWith("<Hide-") || !text.endsWith(">")) return null;
	const body = text.slice(6, -1);
	const separator = body.lastIndexOf("=");
	if (separator <= 0) return null;
	return {
		value: body.slice(0, separator).trim(),
		label: body.slice(separator + 1).trim() || "隐藏图片",
	};
}

/** 日记图片行 → markdown 值（隐藏标记或原始 URL） */
export function resolveDiaryImageValue({ url, hidden, hiddenLabel }) {
	const value = String(url ?? "").trim();
	if (!value) return "";
	if (!hidden) return value;
	return createDiaryHiddenMarker(value, hiddenLabel || "隐藏图片");
}

// ============ frontmatter 解析 ============

/** 去掉双引号并反转转义 */
function unquote(text) {
	const match = text.match(/^"(.*)"$/s);
	if (!match) return text;
	return match[1].replace(/\\(.)/g, (_, ch) =>
		ch === "n" ? "\n" : ch === "t" ? "\t" : ch === "r" ? "\r" : ch,
	);
}

/**
 * 标量 → JS 值。带引号的一律保留为字符串（避免 "123" 标题被转成数字），
 * 只有裸标量才识别布尔 / 数字 / 日期。
 */
function castScalar(text) {
	const raw = text.trim();
	if (raw.startsWith('"')) return unquote(raw);
	if (raw === "true") return true;
	if (raw === "false") return false;
	if (raw === "null" || raw === "~") return null;
	if (/^-?\d+$/.test(raw)) return Number(raw);
	if (/^-?\d+\.\d+$/.test(raw)) return Number(raw);
	return raw;
}

/** 将 flow 序列文本（[...]）拆成顶层元素，尊重引号与嵌套大括号 */
function splitFlowItems(text) {
	const items = [];
	let depth = 0;
	let quote = null;
	let current = "";
	for (const char of text) {
		if (quote) {
			current += char;
			if (char === quote) quote = null;
			continue;
		}
		if (char === '"' || char === "'") {
			quote = char;
		} else if (char === "[" || char === "{") {
			depth++;
		} else if (char === "]" || char === "}") {
			depth--;
		} else if (char === "," && depth === 0) {
			items.push(current);
			current = "";
			continue;
		}
		current += char;
	}
	if (current.trim()) items.push(current);
	return items.map((item) => item.trim()).filter(Boolean);
}

/** 解析 flow 序列：字符串数组 或 对象数组（如 { src: "..." }） */
function parseFlowSequence(text) {
	return splitFlowItems(text).map((item) => {
		const objectMatch = item.match(/^\{(.*)\}$/s);
		if (objectMatch) {
			const object = {};
			for (const part of splitFlowItems(objectMatch[1])) {
				const colon = part.indexOf(":");
				if (colon > 0) {
					object[part.slice(0, colon).trim()] = castScalar(
						part.slice(colon + 1),
					);
				}
			}
			return object;
		}
		return castScalar(item);
	});
}

/** 寻找未转义的闭合字符位置（跨行），返回其行内索引；找不到返回 -1 */
function findCloser(lines, startLine, startCol, open, close) {
	let depth = 0;
	let quote = null;
	for (let line = startLine; line < lines.length; line++) {
		const text = lines[line];
		const from = line === startLine ? startCol : 0;
		for (let col = from; col < text.length; col++) {
			const char = text[col];
			if (quote) {
				if (char === quote) quote = null;
				continue;
			}
			if (char === '"' || char === "'") {
				quote = char;
			} else if (char === open) {
				depth++;
			} else if (char === close) {
				depth--;
				if (depth === 0) return { line, col };
			}
		}
	}
	return null;
}

/** 双引号标量的闭合位置：从 startCol 的开引号之后扫描，跳过反斜杠转义，可跨行 */
function findQuoteCloser(lines, startLine, startCol) {
	for (let line = startLine; line < lines.length; line++) {
		const text = lines[line];
		const from = line === startLine ? startCol + 1 : 0;
		for (let col = from; col < text.length; col++) {
			const char = text[col];
			if (char === "\\") {
				col++;
				continue;
			}
			if (char === '"') return { line, col };
		}
	}
	return null;
}

/**
 * 解析 markdown 文件的 frontmatter。
 *
 * @returns {{ data: Record<string, any>, content: string }}
 *   无 frontmatter 时 data 为空对象、content 为原文。
 */
export function parseFrontmatter(markdown) {
	const text = String(markdown ?? "").replace(/\r\n?/g, "\n");
	const lines = text.split("\n");

	if (lines[0].trim() !== "---") return { data: {}, content: text };

	let end = -1;
	for (let i = 1; i < lines.length; i++) {
		if (lines[i].trim() === "---") {
			end = i;
			break;
		}
	}
	if (end === -1) return { data: {}, content: text };

	const data = {};
	let i = 1;

	while (i < end) {
		const line = lines[i];
		const match = line.match(/^(\s*)([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
		if (!match) {
			i++;
			continue;
		}

		const indent = match[1].length;
		const key = match[2];
		let value = match[3];

		if (value.trim() === "") {
			// 块序列：后续同缩进以上的 "- " 行
			if (lines[i + 1] && /^(\s*)- /.test(lines[i + 1])) {
				const items = [];
				let j = i + 1;
				while (j < end && lines[j].startsWith(`${match[1]}- `)) {
					items.push(castScalar(lines[j].slice(match[1].length + 2)));
					j++;
				}
				data[key] = items;
				i = j;
				continue;
			}
			// 块映射：后续缩进更深的 "key: value" 行
			if (
				lines[i + 1] &&
				indent < getIndent(lines[i + 1]) &&
				/^\s*[A-Za-z_][\w-]*\s*:/.test(lines[i + 1])
			) {
				const nested = {};
				let j = i + 1;
				while (j < end && getIndent(lines[j]) > indent) {
					const sub = lines[j].match(/^\s*([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
					if (sub) nested[sub[1]] = castScalar(sub[2]);
					j++;
				}
				data[key] = nested;
				i = j;
				continue;
			}
			data[key] = null;
			i++;
			continue;
		}

		// 双引号字符串可能跨行（startCol 为开引号位置）
		if (value.trimStart().startsWith('"')) {
			const quoteCol = line.indexOf('"', match[1].length + key.length + 1);
			const closer = findQuoteCloser(lines, i, quoteCol);
			if (closer && closer.line > i) {
				value = lines
					.slice(i, closer.line + 1)
					.join("\n")
					.replace(/^[^"]*"/, '"');
				data[key] = castScalar(value);
				i = closer.line + 1;
				continue;
			}
		}

		// flow 序列可能跨行（photos: [ ... ]）
		if (value.trim().startsWith("[")) {
			const closer = findCloser(lines, i, value.indexOf("["), "[", "]");
			if (closer) {
				const sequenceText = lines
					.slice(i, closer.line + 1)
					.join("\n")
					.replace(/^[^[]*\[/, "")
					.replace(/\][^\]]*$/, "");
				data[key] = parseFlowSequence(sequenceText);
				i = closer.line + 1;
				continue;
			}
		}

		data[key] = castScalar(value);
		i++;
	}

	return {
		data,
		content: lines
			.slice(end + 1)
			.join("\n")
			.replace(/^\n/, ""),
	};
}

function getIndent(line) {
	const match = line.match(/^(\s*)/);
	return match ? match[1].length : 0;
}

// ============ 日期工具 ============

export function getCurrentDate() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function getCurrentDateTime() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");
	return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/** 标题 → 文件名 slug（允许中文） */
export function slugifyTitle(title) {
	return String(title || "")
		.toLowerCase()
		.replace(/[^\w\s\u4e00-\u9fff]/g, "")
		.replace(/\s+/g, "-");
}

/** 把 extraFields 追加为 frontmatter 行（字符串/布尔/数字/数组/对象） */
function appendExtraFields(frontmatter, extraFields, skipKeys = []) {
	let lines = frontmatter;
	for (const [key, value] of Object.entries(extraFields)) {
		if (value === undefined || value === null) continue;
		if (skipKeys.includes(key)) continue;

		if (typeof value === "string") {
			lines += `\n${key}: "${escapeYaml(value)}"`;
		} else if (typeof value === "boolean" || typeof value === "number") {
			lines += `\n${key}: ${value}`;
		} else if (Array.isArray(value)) {
			lines += `\n${key}: [${value.map((v) => `"${escapeYaml(String(v))}"`).join(", ")}]`;
		} else if (typeof value === "object") {
			lines += `\n${key}: ${JSON.stringify(value, null, 2).split("\n").join("\n  ")}`;
		}
	}
	return lines;
}

const CONTENT_DIRECTORY = {
	normal: "src/content/posts",
	diary: "src/content/diary",
	thought: "src/content/thoughts",
	album: "src/content/albums",
};

/**
 * 生成内容 markdown（纯函数）。
 *
 * @param {'normal'|'diary'|'album'|'thought'} type
 * @param {object} data 字段，形状随类型变化：
 *   normal:  { title, published, description, tags[], category, content,
 *              draft, pinned, useImage, image, usePassword, password,
 *              useAuthor, author, useSource, sourceLink, useLicense, licenseName }
 *   diary:   { title, date(datetime-local 原始值), description, tags[], content,
 *              images[], secret, password, imageType, useImage }
 *   album:   { title, date, description, location, tags[], hidden, layout,
 *              columns, cover, albumType: 'local'|'external'|'r2', photos[] }
 *   thought: { content, date, context }
 * @returns {{ content: string, fileName: string, directory: string }}
 */
export function generateMarkdown(type, data = {}) {
	if (type === "album") return generateAlbumMarkdown(data);
	if (type === "thought") return generateThoughtMarkdown(data);
	if (type === "diary") return generateDiaryMarkdown(data);
	return generateNormalMarkdown(data);
}

function generateNormalMarkdown(data) {
	const title = data.title || "";
	const date = data.published || getCurrentDate();
	const description = data.description || "";
	const tags = Array.isArray(data.tags) ? data.tags.filter(Boolean) : [];
	const category = data.category || "";
	const content = data.content || "";

	const extraFields = {};
	extraFields.draft = !!data.draft;
	extraFields.pinned = !!data.pinned;

	if (data.useImage && data.image) extraFields.image = data.image;

	if (data.usePassword) {
		extraFields.encrypted = true;
		extraFields.password = data.password || "666999";
	} else {
		extraFields.encrypted = false;
	}

	if (data.useAuthor && data.author) extraFields.author = data.author;
	if (data.useSource && data.sourceLink)
		extraFields.sourceLink = data.sourceLink;
	if (data.useLicense && data.licenseName)
		extraFields.licenseName = data.licenseName;

	// published 字段必须存在以通过构建验证
	extraFields.published = date;

	let frontmatter = `---\ntitle: "${escapeYaml(title)}"\npublished: ${date}`;
	if (description) frontmatter += `\ndescription: "${escapeYaml(description)}"`;
	if (category) frontmatter += `\ncategory: "${escapeYaml(category)}"`;
	if (tags.length > 0)
		frontmatter += `\ntags: [${tags.map((tag) => `"${escapeYaml(tag)}"`).join(", ")}]`;

	frontmatter = appendExtraFields(frontmatter, extraFields, ["published"]);
	frontmatter += `\n---\n\n${content}`;

	const slug = slugifyTitle(title);
	return {
		content: frontmatter,
		fileName: slug ? `${date}-${slug}.md` : `${date}-untitled.md`,
		directory: CONTENT_DIRECTORY.normal,
	};
}

function generateDiaryMarkdown(data) {
	const title = data.title || "";
	const rawDate = data.date || getCurrentDateTime();
	const date = rawDate.replace("T", " ");
	const description = data.description || "";
	const tags = Array.isArray(data.tags) ? data.tags.filter(Boolean) : [];
	const content = data.content || "";

	const extraFields = { date };

	const images = Array.isArray(data.images) ? data.images.filter(Boolean) : [];
	const secret = (data.secret || "").trim();
	const password = (data.password || "").trim();
	const hasHiddenContent =
		content.includes("<Hide-") ||
		images.some((value) => value.includes("<Hide-"));
	if (secret || hasHiddenContent) extraFields.secret = secret || "666999";
	if (password) extraFields.password = password;

	const imageType = data.imageType || "local";
	if (imageType === "r2" || (imageType === "local" && data.useImage)) {
		extraFields.images = images;
	}

	let frontmatter = `---\ntitle: "${escapeYaml(title)}"`;
	if (description) frontmatter += `\ndescription: "${escapeYaml(description)}"`;
	if (tags.length > 0)
		frontmatter += `\ntags: [${tags.map((tag) => `"${escapeYaml(tag)}"`).join(", ")}]`;
	frontmatter = appendExtraFields(frontmatter, extraFields);
	frontmatter += `\n---\n\n${content}`;

	const slug = slugifyTitle(title);
	const datePrefix = date.split(" ")[0];
	return {
		content: frontmatter,
		fileName: slug ? `${datePrefix}-${slug}.md` : `${datePrefix}-untitled.md`,
		directory: CONTENT_DIRECTORY.diary,
	};
}

function generateAlbumMarkdown(data) {
	const title = data.title || "";
	const date = data.date || getCurrentDate();
	const description = data.description || "";
	const location = data.location || "";
	const tags = Array.isArray(data.tags) ? data.tags.filter(Boolean) : [];
	const hidden = !!data.hidden;
	const layout = data.layout || "grid";
	const columns = Number.parseInt(data.columns, 10) || 3;
	const cover = data.cover || "";
	const albumType = data.albumType || "local";
	const photos = Array.isArray(data.photos) ? photosValues(data.photos) : [];

	// R2 相册本质上是外部链接（图片从外部获取）
	const effectiveMode = albumType === "r2" ? "external" : albumType;

	const content = `# ${title}\n\n${description || "这是一个相册页面"}`;

	const albumData = {
		title,
		date,
		description,
		location,
		tags,
		hidden,
		layout,
		columns,
		cover,
		mode: effectiveMode,
	};

	let frontmatter = `---
title: "${escapeYaml(albumData.title)}"
hidden: ${albumData.hidden}
description: "${escapeYaml(albumData.description)}"
date: "${albumData.date}"
location: "${escapeYaml(albumData.location)}"
tags: [${albumData.tags.map((tag) => `"${escapeYaml(tag)}"`).join(", ")}]
layout: "${albumData.layout}"
columns: ${albumData.columns}`;

	// 外部 / R2 相册：用户指定封面优先，否则取第一张图
	if (albumType === "external" || albumType === "r2") {
		if (albumData.cover) {
			frontmatter += `\ncover: "${escapeYaml(albumData.cover)}"`;
		} else if (photos.length > 0) {
			frontmatter += `\ncover: "${escapeYaml(photos[0])}"`;
		}
	} else if (albumData.cover) {
		frontmatter += `\ncover: "${escapeYaml(albumData.cover)}"`;
	}

	frontmatter += `\nmode: "${albumData.mode}"`;

	if ((albumType === "external" || albumType === "r2") && photos.length > 0) {
		frontmatter += "\nphotos: [";
		frontmatter += `\n${photos.map((photo) => `  { src: "${escapeYaml(photo)}" }`).join(",\n")}`;
		frontmatter += "\n]";
	}

	frontmatter += `\n---\n\n${content}`;

	const slug = slugifyTitle(title);
	return {
		content: frontmatter,
		fileName: slug ? `${date}-${slug}.md` : `${date}-untitled.md`,
		directory: CONTENT_DIRECTORY.album,
	};
}

function photosValues(photos) {
	return photos
		.map((photo) => (typeof photo === "string" ? photo : photo.src))
		.filter(Boolean);
}

function generateThoughtMarkdown(data) {
	const thoughtContent = data.content || "";
	const thoughtDate = data.date || getCurrentDate();
	const thoughtContext = data.context || "";

	let frontmatter = `---\ncontent: "${escapeYaml(thoughtContent)}"\ndate: "${thoughtDate}"`;
	if (thoughtContext)
		frontmatter += `\ncontext: "${escapeYaml(thoughtContext)}"`;
	frontmatter += "\n---";

	const thoughtSlug = thoughtContent
		.substring(0, 30)
		.replace(/[/\\:*?"<>|]/g, "_")
		.replace(/\s+/g, "-");

	return {
		content: frontmatter,
		fileName: `${thoughtDate}-${thoughtSlug}.md`,
		directory: CONTENT_DIRECTORY.thought,
	};
}
