import { defineCollection, z } from 'astro:content';

const writing = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date().optional(),
    draft: z.boolean().default(false)
  })
});

const work = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    summary: z.string().optional(),
    date: z.coerce.date().optional(),
    draft: z.boolean().default(false)
  })
});

const links = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    url: z.string().url(),
    date: z.coerce.date().optional()
  })
});

export const collections = { writing, work, links };
