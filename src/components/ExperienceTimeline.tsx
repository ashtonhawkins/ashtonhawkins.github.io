import { useMemo, useState } from "react";

type Item = {
  org: string; role: string; start: string; end?: string;
  summary: string; highlights: string[]; tools: string[];
  metrics: Record<string, string | number>; links: {label: string; href: string;}[];
};

export default function ExperienceTimeline({ items }: { items: Item[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const sorted = useMemo(() => items.slice().sort((a,b) => (b.start.localeCompare(a.start))), [items]);

  return (
    <div className="space-y-3">
      {sorted.map((it, idx) => {
        const id = `${it.org}-${it.role}-${idx}`;
        const open = expanded === id;
        return (
          <section key={id} className="rounded-lg border border-white/10 p-4">
            <header className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{it.role} · {it.org}</h3>
                <p className="text-sm text-neutral-400">{it.start} – {it.end ?? "Present"}</p>
              </div>
              <button className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                      aria-expanded={open} onClick={() => setExpanded(open ? null : id)}>
                {open ? "Collapse" : "Expand"}
              </button>
            </header>
            {open && (
              <div className="mt-3 grid gap-3 md:grid-cols-[2fr,1fr]">
                <p className="text-neutral-300">{it.summary}</p>
                <ul className="text-sm text-neutral-300">
                  {Object.entries(it.metrics).map(([k,v]) => (
                    <li key={k}><span className="text-neutral-400">{k}:</span> {String(v)}</li>
                  ))}
                </ul>
                <ul className="md:col-span-2 list-disc pl-5 text-neutral-300">
                  {it.highlights.map((h,i)=> <li key={i}>{h}</li>)}
                </ul>
                <div className="md:col-span-2 flex flex-wrap gap-2">
                  {it.tools.map(t => <span key={t} className="text-xs px-2 py-1 rounded bg-white/5">{t}</span>)}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
