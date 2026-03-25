import { defineCollection, z } from "astro:content";

const postsCollection = defineCollection({
	schema: z.object({
		title: z.string(),
		published: z.date(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().nullable().default(""),
		lang: z.string().optional().default(""),
		pinned: z.boolean().optional().default(false),
		author: z.string().optional().default(""),
		sourceLink: z.string().optional().default(""),
		licenseName: z.string().optional().default(""),
		licenseUrl: z.string().optional().default(""),

		/* Page encryption fields */
		encrypted: z.boolean().optional().default(false),
		password: z.string().optional().default(""),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});
const diaryCollection = defineCollection({
	schema: z.object({
		title: z.string(),
		// Allow both `YYYY-MM-DD` and `YYYY-MM-DD HH:mm` (or with seconds) via Date coercion.
		// Users can now write: date: "2026-03-21 23:17" or "2026-03-21T23:17:30+08:00".
		date: z.coerce.date(),
		description: z.string().optional().default(""),
		excerpt: z.string().optional().default(""),
		images: z.array(z.string()).optional().default([]),
		videos: z.array(z.string()).optional().default([]),
		lang: z.string().optional().default(""),
		pinned: z.boolean().optional().default(false),
	}),
});

const albumsCollection = defineCollection({
	schema: z.object({
		title: z.string().optional().default(""),
		description: z.string().optional().default(""),
		date: z.union([z.string(), z.coerce.date()]).optional(),
		location: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		layout: z.string().optional().default("grid"),
		columns: z.number().int().min(1).max(6).optional().default(3),
		hidden: z.boolean().optional().default(false),
		mode: z.enum(["local", "external"]).optional(),
		cover: z.string().optional(),
		photos: z.array(z.any()).optional(),
	}),
});
const specCollection = defineCollection({
	schema: z.object({}),
});
export const collections = {
	posts: postsCollection,
	diary: diaryCollection,
	albums: albumsCollection,
	spec: specCollection,
};
