import { defineCollection, z } from "astro:content";

const baseSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  summary: z.string().max(280),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  ogTitle: z.string().optional()
});

const writing = defineCollection({
  type: "content",
  schema: baseSchema.extend({
    readingTime: z.string().optional()
  })
});

const projects = defineCollection({
  type: "content",
  schema: baseSchema.extend({
    link: z.string().url().optional(),
    status: z.enum(["active", "archived", "upcoming"]).default("active")
  })
});

const press = defineCollection({
  type: "content",
  schema: baseSchema.extend({
    outlet: z.string(),
    url: z.string().url()
  })
});

export const collections = { writing, projects, press };
