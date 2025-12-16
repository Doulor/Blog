#!/usr/bin/env node

/**
 * JPG 到 WebP 转换脚本
 * 
 * 此脚本用于将 JPG 图片批量转换为 WebP 格式，以节省空间并提高网站性能。
 * 支持转换单个文件或整个目录中的所有 JPG 文件。
 * 
 * 使用方法:
 * 1. 转换单个文件: node convert-jpg-to-webp.mjs input.jpg
 * 2. 转换目录中的所有 JPG: node convert-jpg-to-webp.mjs /path/to/directory
 * 3. 转换目录并指定质量: node convert-jpg-to-webp.mjs /path/to/directory 85
 * 
 * 参数:
 * - imagePath: JPG 文件路径或包含 JPG 文件的目录路径
 * - quality: WebP 质量 (0-100, 默认 85)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 将单个 JPG 文件转换为 WebP
 * @param {string} inputPath - 输入的 JPG 文件路径
 * @param {number} quality - WebP 质量 (0-100)
 * @returns {Promise<string>} 转换后的 WebP 文件路径
 */
async function convertJpgToWebp(inputPath, quality = 85) {
    try {
        const outputPath = inputPath.replace(/\.jpe?g$/i, '.webp');
        
        await sharp(inputPath)
            .webp({ quality: quality })
            .toFile(outputPath);
        
        console.log(`✅ 转换成功: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
        return outputPath;
    } catch (error) {
        console.error(`❌ 转换失败 ${inputPath}:`, error.message);
        throw error;
    }
}

/**
 * 检查文件是否为 JPG
 * @param {string} filePath - 文件路径
 * @returns {boolean} 是否为 JPG 文件
 */
function isJpgFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.jpg' || ext === '.jpeg';
}

/**
 * 转换目录中的所有 JPG 文件
 * @param {string} dirPath - 目录路径
 * @param {number} quality - WebP 质量 (0-100)
 */
async function convertJpgsInDirectory(dirPath, quality = 85) {
    try {
        const files = fs.readdirSync(dirPath);
        let convertedCount = 0;
        let failedCount = 0;
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                // 递归处理子目录
                await convertJpgsInDirectory(filePath, quality);
            } else if (isJpgFile(filePath)) {
                try {
                    await convertJpgToWebp(filePath, quality);
                    convertedCount++;
                } catch (error) {
                    failedCount++;
                }
            }
        }
        
        console.log(`\n📁 目录 ${dirPath} 转换完成:`);
        console.log(`   ✅ 成功: ${convertedCount} 个文件`);
        if (failedCount > 0) {
            console.log(`   ❌ 失败: ${failedCount} 个文件`);
        }
    } catch (error) {
        console.error(`❌ 处理目录 ${dirPath} 时出错:`, error.message);
    }
}

/**
 * 主函数
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log('📖 使用方法:');
        console.log('   node convert-jpg-to-webp.mjs <jpg文件或目录> [质量(0-100, 默认85)]');
        console.log('');
        console.log('   示例:');
        console.log('   node convert-jpg-to-webp.mjs image.jpg              # 转换单个文件');
        console.log('   node convert-jpg-to-webp.mjs ./images              # 转换目录下所有JPG');
        console.log('   node convert-jpg-to-webp.mjs ./images 80           # 指定质量转换');
        return;
    }
    
    const inputPath = args[0];
    const quality = args[1] ? parseInt(args[1]) : 85;
    
    // 验证质量参数
    if (isNaN(quality) || quality < 0 || quality > 100) {
        console.error('❌ 质量参数必须是 0-100 之间的数字');
        return;
    }
    
    try {
        const stat = fs.statSync(inputPath);
        
        if (stat.isFile()) {
            if (isJpgFile(inputPath)) {
                console.log(`\n🔄 开始转换文件: ${inputPath}`);
                await convertJpgToWebp(inputPath, quality);
                console.log('🎉 文件转换完成！');
            } else {
                console.error('❌ 指定的文件不是 JPG 格式');
            }
        } else if (stat.isDirectory()) {
            console.log(`\n🔄 开始转换目录: ${inputPath} (质量: ${quality})`);
            await convertJpgsInDirectory(inputPath, quality);
            console.log('🎉 目录转换完成！');
        } else {
            console.error('❌ 指定路径既不是文件也不是目录');
        }
    } catch (error) {
        console.error('❌ 操作失败:', error.message);
    }
}

// 执行主函数
if (process.argv[1] === __filename) {
    main().catch(error => {
        console.error('❌ 脚本执行出错:', error);
        process.exit(1);
    });
}

export { convertJpgToWebp, convertJpgsInDirectory };