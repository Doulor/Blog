/**
 * R2 媒体操作（列表拉取 + 上传 + WebP 转换）
 *
 * 与 worker/r2-media.js 的接口契约对应：
 *   GET  /?dir=<dir>            → [{ name, url, key, size, uploaded }]
 *   POST /  multipart           → { uploaded: [{ url, key, size }], errors: [] }
 *
 * 上传不经 worker：走同源 Pages Function /api/r2-upload 中转，
 * 令牌由服务端持有，浏览器只需带 GitHub 登录态。
 */

import { getToken } from "./github-api.js";

/**
 * 规范化目录名：已含 / 的按原样（视为完整路径），
 * 简短名则加上类型前缀（album / diary）。
 */
export function normalizeR2Directory(directory, prefix) {
	return directory.includes("/") ? directory : `${prefix}/${directory}`;
}

/** 拉取指定目录的媒体条目（完整字段） */
export async function fetchR2Media(workerUrl, directory) {
	const response = await fetch(
		`${workerUrl}?dir=${encodeURIComponent(directory)}`,
	);
	if (!response.ok)
		throw new Error(`获取图片失败: ${response.status} ${response.statusText}`);
	const data = await response.json();
	if (!Array.isArray(data)) throw new Error("返回的数据格式不正确");
	return data;
}

/** 拉取指定目录的图片 URL 列表（按上传时间倒序，与 Worker 返回一致） */
export async function fetchR2ImageUrls(workerUrl, directory) {
	const list = await fetchR2Media(workerUrl, directory);
	return list.map((item) => item.url);
}

/** 浏览器端图片 → WebP，返回 blob */
export function convertImageToWebp(file, quality = 0.82) {
	return new Promise((resolve, reject) => {
		if (!file.type.startsWith("image/")) {
			reject(new Error("不是图片文件"));
			return;
		}
		const objectUrl = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(objectUrl);
			const canvas = document.createElement("canvas");
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;
			canvas.getContext("2d").drawImage(img, 0, 0);
			canvas.toBlob(
				(blob) => (blob ? resolve(blob) : reject(new Error("WebP 转换失败"))),
				"image/webp",
				quality,
			);
		};
		img.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			reject(new Error("图片读取失败"));
		};
		img.src = objectUrl;
	});
}

/**
 * 上传图片到 R2（经同源 Pages Function 中转，令牌在服务端）。
 *
 * @param {object} opts
 * @param {string} opts.directory   已规范化的目标目录
 * @param {File[]} opts.files       待上传文件
 * @param {boolean} opts.convertWebp 是否转为 WebP
 * @param {(msg: string) => void} [opts.onProgress] 进度回调
 * @returns {Promise<Array<{url, key, size}>>} 上传成功的条目
 */
export async function uploadImagesToR2({
	directory,
	files,
	convertWebp,
	onProgress,
}) {
	if (!directory) throw new Error("请先填写 R2 目录名");

	const token = getToken();
	if (!token) throw new Error("未登录，请先登录 GitHub");

	const formData = new FormData();
	formData.append("dir", directory);

	for (const file of files) {
		let f = file;
		if (convertWebp && file.type.startsWith("image/")) {
			const blob = await convertImageToWebp(file);
			const newName = `${file.name.replace(/\.[^.]+$/, "")}.webp`;
			f = new File([blob], newName, { type: "image/webp" });
		}
		formData.append("files", f);
		if (onProgress) onProgress(`已准备 ${f.name}`);
	}

	const response = await fetch("/api/r2-upload", {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
		body: formData,
	});
	if (!response.ok) {
		let msg = `上传失败: ${response.status}`;
		try {
			const err = await response.json();
			if (err.error) msg = err.error;
		} catch {
			/* 非 JSON 错误体 */
		}
		if (response.status === 401) msg = "未登录或登录已过期，请重新登录 GitHub";
		throw new Error(msg);
	}
	const data = await response.json();
	const uploaded = data.uploaded || data || [];
	if (!Array.isArray(uploaded)) throw new Error("返回数据格式不正确");
	return uploaded;
}
