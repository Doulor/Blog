/**
 * R2 媒体操作（列表拉取 + 上传 + WebP 转换）
 *
 * 与 worker/r2-media.js 的接口契约对应：
 *   GET  /?dir=<dir>            → [{ name, url, key, size, uploaded }]
 *   POST /  multipart           → { uploaded: [{ url, key, size }], errors: [] }
 */

const R2_TOKEN_KEY = "r2_upload_token";

export function getR2Token() {
	return localStorage.getItem(R2_TOKEN_KEY) || "";
}

export function setR2Token(token) {
	if (token) localStorage.setItem(R2_TOKEN_KEY, token);
	else localStorage.removeItem(R2_TOKEN_KEY);
}

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
 * 上传图片到 R2。
 *
 * @param {object} opts
 * @param {string} opts.workerUrl   Worker 地址
 * @param {string} opts.directory   已规范化的目标目录
 * @param {string} opts.token       上传令牌
 * @param {File[]} opts.files       待上传文件
 * @param {boolean} opts.convertWebp 是否转为 WebP
 * @param {(msg: string) => void} [opts.onProgress] 进度回调
 * @returns {Promise<Array<{url, key, size}>>} 上传成功的条目
 */
export async function uploadImagesToR2({
	workerUrl,
	directory,
	token,
	files,
	convertWebp,
	onProgress,
}) {
	if (!workerUrl || !directory)
		throw new Error("请先填写 Worker URL 和 R2 目录名");
	if (!token) throw new Error("请填写上传令牌");

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

	const response = await fetch(workerUrl, {
		method: "POST",
		headers: { "X-Upload-Token": token },
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
		throw new Error(msg);
	}
	const data = await response.json();
	const uploaded = data.uploaded || data || [];
	if (!Array.isArray(uploaded)) throw new Error("返回数据格式不正确");
	return uploaded;
}
