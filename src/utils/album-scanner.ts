import type { AlbumGroup, Photo } from "../types/album";

// Astro 内容集合 API 需要在构建时使用，所以定义一个异步函数来获取内容
// 这个函数需要在页面的顶层 await getAlbums() 中使用
export async function scanAlbums(): Promise<AlbumGroup[]> {
	// 使用 Astro 内容集合 API 导入专辑
	const { getCollection } = await import("astro:content");
	const albumEntries = await getCollection("albums");

	const albums: AlbumGroup[] = [];

	for (const albumEntry of albumEntries) {
		const { id, data, body } = albumEntry;
		const albumId = id.replace(/\.md$/, ""); // 移除 .md 后缀获取相册ID
		const albumDirName = getAlbumDirNameFromId(albumId);

		// 检查是否隐藏相册
		if (data.hidden === true) {
			console.log(`相册 ${albumId} 已设置为隐藏，跳过显示`);
			continue;
		}

		// 确定封面图片
		let cover: string;
		const isExternalMode = data.mode === "external";
		if (isExternalMode) {
			if (!data.cover) {
				console.warn(`相册 ${albumId} 外链模式缺少 cover 字段`);
				continue;
			}
			cover = data.cover;
		} else {
			// 本地模式：构建封面路径
			// 检查是否有 cover.webp，否则检查 cover.jpg
			const coverWebpExists = await checkCoverImageExists(albumDirName, 'cover.webp');
			const coverJpgExists = await checkCoverImageExists(albumDirName, 'cover.jpg');

			if (!coverWebpExists && !coverJpgExists) {
				console.warn(`相册 ${albumDirName} 缺少 cover.webp 或 cover.jpg 文件`);
				continue;
			}

			// 优先使用 WebP 格式
			if (coverWebpExists) {
				cover = `/images/albums/${albumDirName}/cover.webp`;
			} else {
				cover = `/images/albums/${albumDirName}/cover.jpg`;
			}
		}

		// 获取相册照片
		const photos: Photo[] = isExternalMode
			? processExternalPhotos(data.photos || [], albumDirName)
			: await scanPhotos(albumDirName);

		albums.push({
			id: albumId, // 使用内容集合的ID作为相册ID
			title: data.title || albumId,
			description: data.description || "",
			cover,
			date: data.date || new Date().toISOString().split("T")[0],
			location: data.location || "",
			tags: data.tags || [],
			layout: data.layout || "grid",
			columns: data.columns || 3,
			photos,
			hidden: data.hidden,
			mode: data.mode,
		});
	}

	return albums;
}

// 直接返回相册ID作为目录名（硬性名称匹配）
function getAlbumDirNameFromId(albumId: string): string {
	return albumId;
}

// 检查封面图片是否存在（支持多种格式）
async function checkCoverImageExists(albumDirName: string, coverFileName: string = "cover.jpg"): Promise<boolean> {
	try {
		const fs = await import("node:fs");
		const path = await import("node:path");
		const coverPath = path.join(process.cwd(), "public", "images", "albums", albumDirName, coverFileName);
		return fs.existsSync(coverPath);
	} catch (e) {
		console.error("检查封面图片时出错:", e);
		return false;
	}
}

// 扫描本地相册照片
async function scanPhotos(albumId: string): Promise<Photo[]> {
	const fs = await import("node:fs");
	const path = await import("node:path");

	const photos: Photo[] = [];
	const albumPath = path.join(process.cwd(), "public", "images", "albums", albumId);

	if (!fs.existsSync(albumPath)) {
		console.warn(`相册目录 ${albumPath} 不存在`);
		return photos;
	}

	const files = fs.readdirSync(albumPath);
	const imageExtensions = [
		".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
		".avif", ".bmp", ".tiff", ".tif"
	];

	// 过滤出图片文件（排除封面图片，支持多种格式）
	const imageFiles = files.filter((file) => {
		const ext = path.extname(file).toLowerCase();
		const lowerCaseFile = file.toLowerCase();
		return imageExtensions.includes(ext) &&
		       lowerCaseFile !== "cover.jpg" &&
		       lowerCaseFile !== "cover.webp" &&
		       lowerCaseFile !== "cover.png" &&
		       lowerCaseFile !== "cover.jpeg";
	});

	// 处理每张照片
	for (let i = 0; i < imageFiles.length; i++) {
		const file = imageFiles[i];
		const filePath = path.join(albumPath, file);
		const stats = fs.statSync(filePath);

		// 解析文件名中的标签
		const { baseName, tags } = parseFileName(file);

		photos.push({
			id: `${albumId}-photo-${i}`,
			src: `/images/albums/${albumId}/${file}`,
			alt: baseName,
			title: baseName,
			tags: tags,
			date: stats.mtime.toISOString().split("T")[0],
		});
	}

	return photos;
}

function processExternalPhotos(
	externalPhotos: any[],
	albumId: string,
): Photo[] {
	const photos: Photo[] = [];

	externalPhotos.forEach((photo, index) => {
		if (!photo?.src) {
			console.warn(`相册 ${albumId} 的第 ${index + 1} 张照片缺少 src 字段`);
			return;
		}

		photos.push({
			id: photo.id || `${albumId}-external-photo-${index}`,
			src: photo.src,
			thumbnail: photo.thumbnail,
			alt: photo.alt || photo.title || `Photo ${index + 1}`,
			title: photo.title,
			description: photo.description,
			tags: photo.tags || [],
			date: photo.date || new Date().toISOString().split("T")[0],
			location: photo.location,
			width: photo.width,
			height: photo.height,
			camera: photo.camera,
			lens: photo.lens,
			settings: photo.settings,
		});
	});

	return photos;
}

function parseFileName(fileName: string): { baseName: string; tags: string[] } {
	// 手动实现类似 path.basename 和 path.extname 的功能
	const lastDotIndex = fileName.lastIndexOf('.');
	const ext = lastDotIndex === -1 ? '' : fileName.substring(lastDotIndex);
	const baseNameWithExt = lastDotIndex === -1 ? fileName : fileName.substring(0, lastDotIndex);

	// 匹配文件名中的标签，格式为：文件名_标签1_标签2.扩展名
	const parts = baseNameWithExt.split("_");

	if (parts.length > 1) {
		// 第一部分作为基本名称，其余部分作为标签
		const baseName = parts.slice(0, -2).join("_");
		const tags = parts.slice(-2);
		return { baseName, tags };
	}

	// 如果没有标签，返回不带扩展名的文件名
	return { baseName: baseNameWithExt, tags: [] };
}
