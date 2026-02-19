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
    employer: z.string(),
    year: z.string(),
    category: z.array(z.string()),
    description: z.string(),
    problem: z.string().optional(),
    insight: z.string().optional(),
    approach: z.array(z.string()).optional(),
    results: z.array(z.string()).optional(),
    impact: z.string().optional(),
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
