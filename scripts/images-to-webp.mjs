#!/usr/bin/env node

/**
 * 图片批量转 WebP 脚本（整合自根目录下 4 个重复的转换脚本）
 *
 * 支持单文件或目录（递归），支持 JPG/JPEG/PNG/GIF/BMP，跳过已是 WebP 的文件。
 *
 * 使用方法:
 *   pnpm webp <文件或目录> [质量(0-100, 默认 82)]
 *   node scripts/images-to-webp.mjs ./public/images 80
 *
 * 示例:
 *   pnpm webp image.jpg        # 转换单个文件
 *   pnpm webp ./public/images  # 递归转换目录下所有图片
 *   pnpm webp ./public/images 80   # 指定质量
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);

const INPUT_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".bmp"];
const DEFAULT_QUALITY = 82;

/** 判断文件是否为可转换的图片格式 */
function isConvertible(filePath) {
	return INPUT_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

/** 转换单个图片为 WebP */
async function convertImage(inputPath, quality) {
	const outputPath = `${inputPath.replace(/\.[^.]+$/, "")}.webp`;
	await sharp(inputPath).webp({ quality }).toFile(outputPath);
	console.log(`  ✅ ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
	return outputPath;
}

/** 递归转换目录 */
async function convertDirectory(dirPath, quality) {
	let converted = 0;
	let failed = 0;

	for (const file of fs.readdirSync(dirPath)) {
		const filePath = path.join(dirPath, file);
		const stat = fs.statSync(filePath);

		if (stat.isDirectory()) {
			const sub = await convertDirectory(filePath, quality);
			converted += sub.converted;
			failed += sub.failed;
		} else if (isConvertible(filePath)) {
			try {
				await convertImage(filePath, quality);
				converted++;
			} catch (error) {
				console.error(`  ❌ 转换失败 ${filePath}: ${error.message}`);
				failed++;
			}
		}
	}

	return { converted, failed };
}

async function main() {
	const args = process.argv.slice(2);

	if (args.length < 1) {
		console.log("📖 使用方法:");
		console.log("   pnpm webp <图片文件或目录> [质量(0-100, 默认 82)]");
		console.log("");
		console.log("   示例:");
		console.log("   pnpm webp image.jpg            # 转换单个文件");
		console.log("   pnpm webp ./public/images      # 递归转换目录下所有图片");
		console.log("   pnpm webp ./public/images 80   # 指定质量转换");
		return;
	}

	const inputPath = args[0];
	const quality = args[1] ? Number.parseInt(args[1], 10) : DEFAULT_QUALITY;

	if (Number.isNaN(quality) || quality < 0 || quality > 100) {
		console.error("❌ 质量参数必须是 0-100 之间的数字");
		process.exit(1);
	}

	let stat;
	try {
		stat = fs.statSync(inputPath);
	} catch {
		console.error(`❌ 路径不存在: ${inputPath}`);
		process.exit(1);
	}

	try {
		if (stat.isFile()) {
			if (!isConvertible(inputPath)) {
				console.error(`❌ 不支持的格式: ${path.extname(inputPath)}`);
				process.exit(1);
			}
			console.log(`\n🔄 转换文件: ${inputPath} (质量: ${quality})`);
			await convertImage(inputPath, quality);
		} else if (stat.isDirectory()) {
			console.log(`\n🔄 转换目录: ${inputPath} (质量: ${quality})`);
			const result = await convertDirectory(inputPath, quality);
			console.log(`\n📁 完成: ✅ ${result.converted} 个成功${result.failed ? `, ❌ ${result.failed} 个失败` : ""}`);
			if (result.converted === 0) console.log("⚠️  未找到可转换的图片（支持 JPG/PNG/GIF/BMP）");
		}
		console.log("🎉 转换完成！");
	} catch (error) {
		console.error("❌ 操作失败:", error.message);
		process.exit(1);
	}
}

if (process.argv[1] === __filename) {
	main().catch((error) => {
		console.error("❌ 脚本执行出错:", error);
		process.exit(1);
	});
}

export { convertImage, convertDirectory };
