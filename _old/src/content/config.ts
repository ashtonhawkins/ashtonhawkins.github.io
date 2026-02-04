import { defineCollection, z } from "astro:content";

const writing = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string().max(280),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    ogTitle: z.string().optional()
  })
});

const projects = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string().max(280),
    role: z.string(),
    stack: z.array(z.string()).default([]),
    links: z
      .array(
        z.object({
          label: z.string(),
          url: z.string().url()
        })
      )
      .default([]),
    impact: z.array(z.string()).default([]),
    coverEmoji: z.string().min(1).max(4)
  })
});

const press = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    outlet: z.string(),
    url: z.string().url()
  })
});

export const collections = { writing, projects, press };
