import { z, defineCollection } from "astro:content";

const workItem = z.object({
  org: z.string(),
  role: z.string(),
  start: z.string(),   // ISO: "2023-10"
  end: z.string().optional(), // "present" or ISO
  summary: z.string(),
  highlights: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  metrics: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
});

const projectItem = z.object({
  name: z.string(),
  period: z.string(),
  summary: z.string(),
  tags: z.array(z.string()).default([]),
  links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
  impact: z.array(z.string()).default([]),
});

const resume = defineCollection({
  type: "data",
  schema: z.object({
    person: z.object({
      name: z.string(),
      title: z.string(),
      blurb: z.string(),
      location: z.string(),
      email: z.string().email(),
      phone: z.string().optional(),
      urls: z.object({
        site: z.string().url().optional(),
        linkedin: z.string().url().optional(),
        github: z.string().url().optional(),
      }).default({}),
    }),
    keywords: z.array(z.string()).default([]),
    work: z.array(workItem),
    projects: z.array(projectItem),
    skills: z.object({
      design: z.array(z.string()).default([]),
      engineering: z.array(z.string()).default([]),
      other: z.array(z.string()).default([]),
    }),
  }),
});

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

export const collections = { resume, writing, projects, press };
