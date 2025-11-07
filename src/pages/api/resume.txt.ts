import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';

export const GET: APIRoute = async () => {
  const { data } = await getEntry('resume', 'data');
  const lines: string[] = [];
  lines.push(`${data.person.name} — ${data.person.title}`);
  lines.push(data.person.blurb, '', `Location: ${data.person.location}`, `Email: ${data.person.email}`, '');
  lines.push('Work:');
  data.work.forEach(w => {
    lines.push(`- ${w.role} · ${w.org} (${w.start}–${w.end ?? "Present"})`);
    w.highlights.forEach(h => lines.push(`  • ${h}`));
  });
  lines.push('', 'Projects:');
  data.projects.forEach(p => lines.push(`- ${p.name} — ${p.summary}`));
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
