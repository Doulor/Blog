import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function convertImagesInDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // 递归处理子目录
            await convertImagesInDirectory(filePath);
        } else {
            const ext = path.extname(file).toLowerCase();
            if (imageExtensions.includes(ext) && ext !== '.webp') {
                const outputPath = path.join(dirPath, path.basename(file, ext) + '.webp');

                try {
                    await sharp(filePath)
                        .webp({ quality: 80 })
                        .toFile(outputPath);

                    console.log(`转换成功: ${file} -> ${path.basename(file, ext)}.webp`);

                    // 为了安全起见，先保留原文件，用户可以手动删除
                    console.log(`原文件 ${file} 已保留，如果确认转换无误可以手动删除`);
                } catch (error) {
                    console.error(`转换失败 ${file}:`, error);
                }
            }
        }
    }
}

async function processAllImageDirectories() {
    const imageDirs = [
        path.join(__dirname, 'public', 'images', 'albums'),
        path.join(__dirname, 'public', 'images', 'diary'),
        path.join(__dirname, 'public', 'images', 'posts')
    ];

    for (const imageDir of imageDirs) {
        if (fs.existsSync(imageDir)) {
            console.log(`正在转换目录: ${imageDir}`);
            await convertImagesInDirectory(imageDir);
        } else {
            console.log(`目录不存在，跳过: ${imageDir}`);
        }
    }
}

// 执行转换
processAllImageDirectories().catch(error => {
    console.error('转换过程中出现错误:', error);
});