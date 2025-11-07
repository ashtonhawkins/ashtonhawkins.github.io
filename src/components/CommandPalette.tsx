import { useEffect, useMemo, useState } from "react";

type Action = { id: string; label: string; href: string };

export default function CommandPalette({ actions }: { actions: Action[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setOpen(o => !o);
      }
    }
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return actions;
    return actions
      .map(a => ({ a, score: score(a.label.toLowerCase(), n) }))
      .filter(x => x.score > 0.45)
      .sort((a,b) => b.score - a.score)
      .map(x => x.a);
  }, [q, actions]);

  return (
    <>
      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-start pt-24 bg-black/50 backdrop-blur">
          <div className="w-[min(640px,calc(100vw-2rem))] rounded-xl bg-neutral-900 border border-white/10 shadow-xl">
            <input autoFocus value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Type a command or search…"
              className="w-full bg-transparent px-4 py-3 outline-none" />
            <ul className="max-h-80 overflow-y-auto">
              {results.map(r => (
                <li key={r.id}>
                  <a className="block px-4 py-2 hover:bg-white/5" href={r.href} onClick={()=>setOpen(false)}>{r.label}</a>
                </li>
              ))}
              {results.length === 0 && <li className="px-4 py-6 text-sm text-neutral-400">No results</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

function score(text: string, needle: string) {
  let ti=0, ni=0;
  while (ti<text.length && ni<needle.length) { if (text[ti]===needle[ni]) ni++; ti++; }
  return ni / needle.length;
}
