import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function convertImagesToWebP(albumDir) {
    const albumPath = path.join(__dirname, 'public', 'images', 'albums', albumDir);
    
    if (!fs.existsSync(albumPath)) {
        console.log(`相册目录 ${albumPath} 不存在`);
        return;
    }

    const files = fs.readdirSync(albumPath);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];

    for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (imageExtensions.includes(ext) && ext !== '.webp') {
            const inputPath = path.join(albumPath, file);
            const outputPath = path.join(albumPath, path.basename(file, ext) + '.webp');
            
            try {
                await sharp(inputPath)
                    .webp({ quality: 80 })
                    .toFile(outputPath);
                
                console.log(`转换成功: ${file} -> ${path.basename(file, ext)}.webp`);
                
                // 删除原文件（注意：这里暂时注释掉，以防误删）
                // fs.unlinkSync(inputPath);
                console.log(`原文件 ${file} 已保留，如果确认转换无误可以手动删除`);
            } catch (error) {
                console.error(`转换失败 ${file}:`, error);
            }
        }
    }
}

// 转换所有相册目录中的图片
async function convertAllAlbums() {
    const albumsPath = path.join(__dirname, 'public', 'images', 'albums');
    const albumDirs = fs.readdirSync(albumsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    for (const albumDir of albumDirs) {
        console.log(`正在转换相册: ${albumDir}`);
        await convertImagesToWebP(albumDir);
    }
}

// 执行转换
convertAllAlbums();