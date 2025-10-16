import type {
	AnnouncementConfig,
	CommentConfig,
	ExpressiveCodeConfig,
	FooterConfig,
	FullscreenWallpaperConfig,
	LicenseConfig,
	MusicPlayerConfig,
	NavBarConfig,
	ProfileConfig,
	SakuraConfig,
	SidebarLayoutConfig,
	SiteConfig,
	PioConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";
import { getTranslateLanguageFromConfig } from "./utils/language-utils";

// 定义站点语言
const SITE_LANG = "zh_CN"; 

export const siteConfig: SiteConfig = {
	title: "Doulorの博客",
	subtitle: "",
	lang: SITE_LANG,
	themeColor: {
		hue: 210,
		fixed: false,
	},
	translate: {
		enable: true,
		service: "client.edge",
		defaultLanguage: getTranslateLanguageFromConfig(SITE_LANG),
		showSelectTag: false,
		autoDiscriminate: true,
		ignoreClasses: ["ignore", "banner-title", "banner-subtitle"],
		ignoreTags: ["script", "style", "code", "pre"],
	},
	banner: {
		enable: true,
		src: {
			desktop: [
				"/assets/desktop-banner/d1.webp",
				"/assets/desktop-banner/d2.webp",
				"/assets/desktop-banner/d3.webp",
				"/assets/desktop-banner/d4.webp",
				"/assets/desktop-banner/d5.webp",
				"/assets/desktop-banner/d6.webp",
				"/assets/desktop-banner/d7.webp",
				"/assets/desktop-banner/d8.webp",
			],
			mobile: [
				"/assets/mobile-banner/m1.webp",
				"/assets/mobile-banner/m2.webp",
				"/assets/mobile-banner/m3.webp",
				"/assets/mobile-banner/m4.webp",
				"/assets/mobile-banner/m5.webp",
				"/assets/mobile-banner/m6.webp",
				"/assets/mobile-banner/m7.webp",
				"/assets/mobile-banner/m8.webp",
			],
		},
		position: "center",
		carousel: {
			enable: true,
			interval: 5,
		},
		imageApi: {
			enable: false,
			url: "http://domain.com/api_v2.php?format=text&count=4",
		},
		homeText: {
			enable: true,
			title: "DoulorのBlog",
			subtitle: [
				"茶已温妥，风携清宁",
				"君踏光至，暖意盈庭...",
			],
			typewriter: {
				enable: true,
				speed: 300,
				deleteSpeed: 100,
				pauseTime: 2000,
			},
		},
		credit: {
			enable: false,
			text: "Describe",
			url: "",
		},
		navbar: {
			transparentMode: "semifull",
		},
	},
	toc: {
		enable: true,
		depth: 3,
	},
	generateOgImages: false,
	favicon: [],
	font: {
		zenMaruGothic: {
			enable: true,
		},
	},
};

export const fullscreenWallpaperConfig: FullscreenWallpaperConfig = {
	enable: true,
	src: {
		desktop: [
			"/assets/desktop-banner/d1.webp",
			"/assets/desktop-banner/d2.webp",
			"/assets/desktop-banner/d3.webp",
			"/assets/desktop-banner/d4.webp",
			"/assets/desktop-banner/d5.webp",
			"/assets/desktop-banner/d6.webp",
			"/assets/desktop-banner/d7.webp",
			"/assets/desktop-banner/d8.webp",
		],
		mobile: [
			"/assets/mobile-banner/m1.webp",
			"/assets/mobile-banner/m2.webp",
			"/assets/mobile-banner/m3.webp",
			"/assets/mobile-banner/m4.webp",
			"/assets/mobile-banner/m5.webp",
			"/assets/mobile-banner/m6.webp",
			"/assets/mobile-banner/m7.webp",
			"/assets/mobile-banner/m8.webp",
		],
	},
	position: "center",
	carousel: {
		enable: true,
		interval: 1,
	},
	zIndex: -1,
	opacity: 0.8,
	blur: 1,
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		{
			name: "链接",
			url: "/links/",
			icon: "material-symbols:link",
			children: [
				{
					name: "GitHub",
					url: "https://github.com/Doulor",
					external: true,
					icon: "fa6-brands:github",
				},
				{
					name: "Bilibili",
					url: "https://space.bilibili.com/1307574205",
					external: true,
					icon: "fa6-brands:bilibili",
				},
				{
					name: "Discord",
					url: "https://discord.gg/PtRr6usx6V",
					external: true,
					icon: "fa6-brands:discord",
				},
				{
					name: "Post-editor",
					url: "https://tool.firef.dpdns.org",
					external: true,
					icon: "mdi:file-edit",
				},
			],
		},
		{
			name: "个人",
			url: "/content/",
			icon: "material-symbols:person",
			children: [
				LinkPreset.Diary,
				{
					name: "相册",
					url: "/albums/",
					icon: "material-symbols:photo-library",
				},
			],
		},
		{
			name: "关于",
			url: "/content/",
			icon: "material-symbols:info",
			children: [LinkPreset.About],
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/avatar.png",
	name: "Doulor",
	bio: "世界很大，不妨到处走走",
	links: [
		{
			name: "Bilibli",
			icon: "fa6-brands:bilibili",
			url: "https://space.bilibili.com/1307574205",
		},
		{
			name: "Gitee",
			icon: "fa6-brands:qq",
			url: "https://res.abeim.cn/api/qq/?qq=2737855297",
		},
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/Doulor",
		},
		{
			name: "Discord",
			icon: "fa6-brands:discord",
			url: "https://discord.gg/PtRr6usx6V",
		},
	],
	umami: {
		enable: false,
		shareId: "",
		region: "eu",
	},
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	theme: "github-dark",
};

export const commentConfig: CommentConfig = {
	enable: true, // 启用评论功能
	supabase: {
		table: "comments", // 对应 Supabase 中的评论表名
	},
};

export const announcementConfig: AnnouncementConfig = {
	title: "公告内容",
	content: "欢迎来到Doulor的Blog，这里用于存放各种小帖子与内容。",
	closable: true,
	link: {
		enable: true,
		text: "查看更多",
		url: "/about/",
		external: false,
	},
};

export const musicPlayerConfig: MusicPlayerConfig = {
	enable: true,
};

export const footerConfig: FooterConfig = {
	enable: false,
};

export const sidebarLayoutConfig: SidebarLayoutConfig = {
	enable: true,
	position: "left",
	components: [
		{
			type: "profile",
			enable: true,
			order: 1,
			position: "top",
			class: "onload-animation",
			animationDelay: 0,
		},
		{
			type: "announcement",
			enable: true,
			order: 2,
			position: "top",
			class: "onload-animation",
			animationDelay: 50,
		},
		{
			type: "categories",
			enable: true,
			order: 3,
			position: "sticky",
			class: "onload-animation",
			animationDelay: 150,
			responsive: {
				collapseThreshold: 5,
			},
		},
		{
			type: "tags",
			enable: true,
			order: 4,
			position: "sticky",
			class: "onload-animation",
			animationDelay: 200,
			responsive: {
				collapseThreshold: 20,
			},
		},
	],
	defaultAnimation: {
		enable: true,
		baseDelay: 0,
		increment: 50,
	},
	responsive: {
		breakpoints: {
			mobile: 768,
			tablet: 1024,
			desktop: 1280,
		},
		layout: {
			mobile: "sidebar",
			tablet: "sidebar",
			desktop: "sidebar",
		},
	},
};

export const sakuraConfig: SakuraConfig = {
	enable: true,
	sakuraNum: 2,
	limitTimes: -1,
	size: {
		min: 0.5,
		max: 1.1,
	},
	speed: {
		horizontal: {
			min: -1.7,
			max: -1.2,
		},
		vertical: {
			min: 1.5,
			max: 2.2,
		},
		rotation: 0.03,
	},
	zIndex: 100,
};

export const pioConfig: PioConfig = {
	enable: false,
	models: ["/pio/models/pio/model.json"],
	position: "left",
	width: 280,
	height: 250,
	mode: "draggable",
	hiddenOnMobile: true,
	dialog: {
		welcome: "Welcome to Mizuki Website!",
		touch: [
			"What are you doing?",
			"Stop touching me!",
			"HENTAI!",
			"Don't bully me like that!",
		],
		home: "Click here to go back to homepage!",
		skin: ["Want to see my new outfit?", "The new outfit looks great~"],
		close: "QWQ See you next time~",
		link: "https://github.com/matsuzaka-yuki/Mizuki",
	},
};

export const widgetConfigs = {
	profile: profileConfig,
	announcement: announcementConfig,
	music: musicPlayerConfig,
	layout: sidebarLayoutConfig,
	sakura: sakuraConfig,
	fullscreenWallpaper: fullscreenWallpaperConfig,
	pio: pioConfig,
} as const;