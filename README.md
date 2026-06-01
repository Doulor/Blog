# 🌸 Mizuki — Personal Blog (Fork)

![Node.js >= 20](https://img.shields.io/badge/node.js-%3E%3D20-brightgreen)
![pnpm >= 9](https://img.shields.io/badge/pnpm-%3E%3D9-blue)
![Astro](https://img.shields.io/badge/Astro-5-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![Mizuki Screenshot](./docs/image/1.png)

![Mizuki Screenshot](./docs/image/2.png)

![Mizuki Screenshot](./docs/image/3.png)

A modern, feature-rich static blog template built with [Astro](https://astro.build).

This project is a **fork of [LyraVoid/Mizuki](https://github.com/LyraVoid/Mizuki)** with significant refactoring. The core differentiator is the **web-based content publishing system** — you can create, edit, and delete blog posts, diaries, and photo albums directly from the web interface and push changes to your GitHub repository, without touching the codebase locally.

[**🖥️ Live Demo**](https://doulor.cn/) &nbsp;|&nbsp; [**📝 Live Blog**](https://blog.doulor.cn/)

🌏 README Languages
[**English**](./README.md) /
[**中文**](./README.zh.md) /
[**日本語**](./docs/README.ja.md) /
[**中文繁体**](./docs/README.tw.md) /

---

## ⚠️ 关于此 Fork

本分支基于 [LyraVoid/Mizuki](https://github.com/LyraVoid/Mizuki)（上游最新版已至 v9.0+），进行了规模性重构。由于上游仍在持续更新，本分支的部分功能可能落后于上游最新版本。

### 与上游的主要差异

| 方面 | 本分支 (Doulor/Blog) | 上游 (LyraVoid/Mizuki) |
|---|---|---|
| **核心特色** | 网页端内容推送系统（在线创建/编辑/删除） | 代码-内容分离模式，自动分辨率适配 |
| **Astro 版本** | 5.x | 6.x |
| **Tailwind CSS** | v3 | v4 |
| **内容管理** | 网页端直接创建内容并提交到 GitHub | 本地编辑器操作 |
| **图片灯箱** | PhotoSwipe | Fancybox |
| **密码保护** | bcryptjs/crypto-js 加密 | 不支持 |
| **留言板** | Supabase 后端 | Twikoo |
| **许可证** | MIT | Apache 2.0 |

---

## 🔥 核心特色：网页端内容推送

这是本分支最重要的功能。通过网页界面，你可以：

- **📝 内容创建器** (`/create-content/`) — 在线创建帖子、日记、相册，生成 frontmatter 后直接推送到 GitHub 仓库
- **📋 内容管理器** (`/content-manager/`) — 浏览、搜索、编辑、删除博客中已有的所有内容
- **✏️ 在线编辑器** (`/my-editor/`) — 统一的内容编辑界面

所有这些操作通过 **GitHub Personal Access Token** 认证，内容会以 commit 的形式直接提交到你的 GitHub 仓库，触发 Vercel/Netlify 等平台的自动部署。

---

## ✨ Features

### 🔥 Web-Based Content Management (Core Feature)
- [x] **Content Creator** — Create posts, diaries, and albums with a visual form
- [x] **Content Manager** — Browse, search, edit, and delete all content online
- [x] **Online Editor** — Full Markdown editing experience in the browser
- [x] **GitHub API Integration** — Push content directly via Personal Access Token
- [x] **Content Encryption** — Password-protect posts and hidden diary content
- [x] **R2 Image Support** — Fetch images from Cloudflare R2 storage for albums and diaries

### 🎨 Design & Interface
- [x] Built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com)
- [x] Smooth animations and page transitions using [Swup](https://swup.js.org/)
- [x] Light/dark theme switching with system preference detection
- [x] Customizable theme colors and dynamic banner carousel
- [x] Fullscreen background images with carousel, opacity, and blur effects
- [x] Fully responsive design for all devices
- [x] Beautiful typography with JetBrains Mono font
- [x] **Pio Live2D** interactive companion character

### 🔍 Content & Search
- [x] Advanced search functionality based on [Pagefind](https://pagefind.app/)
- [x] Enhanced Markdown features with syntax highlighting
- [x] Interactive table of contents with auto-scrolling
- [x] RSS feed generation
- [x] Reading time estimation
- [x] Article categorization and tagging system

### 🌐 Internationalization
- [x] Multi-language support with real-time translation
- [x] Automatic language detection based on user preferences
- [x] Client-side translation powered by Edge Translate
- [x] Support for 10+ languages (Chinese, English, Japanese, Korean, Spanish, etc.)

### 📱 Special Pages
- [x] **Anime Tracking Page** — Track anime watching progress and ratings
- [x] **Friends Page** — Beautiful cards showcasing friend websites
- [x] **Diary Page** — Share life moments, similar to social media
- [x] **Archive Page** — Organized timeline view of articles
- [x] **About Page** — Customizable personal introduction
- [x] **Guestbook** — Visitor comments powered by Supabase

### 🛠 Technical Features
- [x] Enhanced code blocks based on [Expressive Code](https://expressive-code.com/)
- [x] Math formula support with KaTeX rendering
- [x] Image optimization with PhotoSwipe gallery integration
- [x] SEO optimization including sitemaps and meta tags
- [x] Performance optimization with lazy loading and caching
- [x] Supabase integration for guestbook

## 🚀 Quick Start

### 📦 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Doulor/Blog.git
   cd Blog
   ```

2. **Install dependencies:**
   ```bash
   # Install pnpm if not already installed
   npm install -g pnpm

   # Install project dependencies
   pnpm install
   ```

3. **Configure your blog:**
   - Edit `src/config.ts` to customize blog settings
   - Update site information, theme colors, banner images, and social links
   - Configure translation settings and feature page functionality
   - Set up Supabase credentials for guestbook (optional)
   - Set up `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` in `.env`

4. **Start the development server:**
   ```bash
   pnpm dev
   ```
   Your blog will be available at `http://localhost:4321`

### 📝 Web-Based Content Management

The web-based content system is the core feature of this fork:

- **Create content:** Visit `/create-content/` to create posts, diaries, or albums
- **Manage content:** Visit `/content-manager/` to browse, edit, or delete existing content
- **Edit content:** Visit `/my-editor/` for the unified editing interface

All operations require a **GitHub Personal Access Token** (stored locally in your browser's localStorage). The content is pushed directly to your GitHub repository as commits.

### 🚀 Deployment

Deploy your blog to any static hosting platform:

- **Vercel:** Connect your GitHub repository to Vercel
- **Netlify:** Deploy directly from GitHub
- **GitHub Pages:** Use the included GitHub Actions workflow
- **Cloudflare Pages:** Connect your repository

Before deployment, update the `site` URL in `astro.config.mjs`.

## 📝 Post Frontmatter Format

```yaml
---
title: My First Blog Post
published: 2023-09-09
description: This is the first post of my new blog.
image: ./cover.jpg
tags: [tag1, tag2]
category: Frontend
draft: false
pinned: false
lang: en      # Only set when article language differs from site language in config.ts
---
```

### Frontmatter Field Descriptions

- **title**: Article title (required)
- **published**: Publication date (required)
- **description**: Article description for SEO and previews
- **image**: Cover image path (relative to article file)
- **tags**: Array of tags for categorization
- **category**: Article category
- **draft**: Set to `true` to hide article in production
- **pinned**: Set to `true` to pin article to top
- **lang**: Article language (only set when different from site default)

## 🧩 Markdown Extensions

Mizuki supports enhanced features beyond standard GitHub Flavored Markdown:

### 📝 Enhanced Writing
- **Callouts:** Create beautiful annotation boxes using `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, etc.
- **Math Formulas:** Write LaTeX math formulas using `$inline$` and `$$block$$` syntax
- **Code Highlighting:** Advanced syntax highlighting with line numbers and copy buttons
- **GitHub Cards:** Embed repository cards using `::github{repo="user/repo"}`

### 🎨 Visual Elements
- **Image Gallery:** Automatic PhotoSwipe integration for image viewing
- **Collapsible Sections:** Create expandable content blocks
- **Custom Components:** Enhance content with special directives

### 📊 Content Organization
- **Table of Contents:** Automatically generated from headings with smooth scrolling
- **Reading Time:** Automatically calculated and displayed
- **Article Metadata:** Rich frontmatter support with categories and tags

## ⚡ Commands

All commands are run from the project root:

| Command                    | Action                                   |
|:---------------------------|:-----------------------------------------|
| `pnpm install`             | Install dependencies                     |
| `pnpm dev`                 | Start local dev server at `localhost:4321` |
| `pnpm build`               | Build production site to `./dist/`       |
| `pnpm preview`             | Preview build locally before deployment  |
| `pnpm check`               | Run Astro error checking                 |
| `pnpm format`              | Format code with Biome                   |
| `pnpm lint`                | Check and fix code issues                |
| `pnpm new-post <filename>` | Create a new blog post                   |
| `pnpm astro ...`           | Run Astro CLI commands                   |

## 🎯 Configuration Guide

### 🔧 Basic Configuration

Edit `src/config.ts` to customize your blog:

```typescript
export const siteConfig: SiteConfig = {
  title: "Your Blog Name",
  subtitle: "Your Blog Description",
  lang: "en", // or "zh-CN", "ja", etc.
  themeColor: {
    hue: 210, // 0-360, theme hue
    fixed: false, // Hide theme color picker
  },
  translate: {
    enable: true, // Enable translation
    service: "client.edge", // Translation service
    defaultLanguage: "english",
  },
  banner: {
    enable: true,
    src: ["assets/banner/1.webp"], // Banner images
    carousel: {
      enable: true,
      interval: 0.8, // seconds
    },
  },
};
```

## 📄 License

This project is a fork of [LyraVoid/Mizuki](https://github.com/LyraVoid/Mizuki) with significant modifications, licensed under the MIT License.

The original Mizuki project is built upon the [Fuwari](https://github.com/saicaca/fuwari) template by [saicaca](https://github.com/saicaca).

## 🙏 Acknowledgements

This blog is built on the excellent work of others:

- **Upstream Project**: [LyraVoid/Mizuki](https://github.com/LyraVoid/Mizuki) by [LyraVoid](https://github.com/LyraVoid) — the original Mizuki template this fork is based on
- **Original Template**: [Fuwari](https://github.com/saicaca/fuwari) by [saicaca](https://github.com/saicaca)
- **Design Inspiration**: [Yukina](https://github.com/WhitePaper233/yukina) — a beautiful and elegant blog template
- **Framework**: Built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com)
- **Translation**: Translation functionality powered by [translate](https://gitee.com/mail_osc/translate)
- **Icons**: Icons from [Iconify](https://iconify.design/)

### About This Fork

This fork focuses on adding **web-based content management capabilities** to the Mizuki template:
- Web-based content creation, editing, and deletion
- GitHub API integration for content push
- Password protection for posts and hidden diary content
- Supabase backend for guestbook
- Cloudflare R2 integration for image management

---

⭐ If you find this project helpful, please consider giving it a star!
