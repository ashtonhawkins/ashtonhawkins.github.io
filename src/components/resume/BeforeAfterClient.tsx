import { useState } from "react";

type Item = {
  id: string;
  title: string;
  beforeImg: string;
  afterImg: string;
  note: string;
};

const clamp = (value: number) => Math.min(100, Math.max(0, value));

export default function BeforeAfterClient({ items }: { items: Item[] }) {
  const [positions, setPositions] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((item) => [item.id, 50]))
  );

  const updatePosition = (id: string, next: number) => {
    setPositions((prev) => ({ ...prev, [id]: clamp(next) }));
  };

  return (
    <section className="rounded-3xl border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] bg-[var(--surface-alt)] p-8 shadow-lg shadow-black/10">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--ink)]">Before / After</h2>
          <span className="text-xs text-[var(--ink-2)]">Drag to compare</span>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {items.map((item) => {
            const position = positions[item.id] ?? 50;
            return (
              <article
                key={item.id}
                className="card flex flex-col gap-4 rounded-2xl border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] bg-[var(--surface)] p-4 shadow-inner shadow-black/5"
              >
                <div className="relative aspect-video overflow-hidden rounded-xl bg-black" style={{ clipPath: "inset(0)", isolation: "isolate" }}>
                  <img src={item.afterImg} alt={`${item.title} after`} className="absolute inset-0 h-full w-full object-cover" />
                  <div
                    className="absolute inset-0"
                    style={{
                      clipPath: `inset(0 ${100 - position}% 0 0)`
                    }}
                  >
                    <img src={item.beforeImg} alt={`${item.title} before`} className="h-full w-full object-cover" />
                  </div>
                  <div className="pointer-events-none absolute inset-y-0" style={{ left: `${position}%` }}>
                    <div className="relative -ml-[1px] h-full w-[2px] bg-[var(--accent)]">
                      <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-[var(--accent)] px-2 py-1 text-xs text-white">
                        ↔
                      </span>
                    </div>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={position}
                  onChange={(event) => updatePosition(item.id, Number(event.target.value))}
                  className="accent-[var(--accent)]"
                />
                <div>
                  <h3 className="text-base font-semibold text-[var(--ink)]">{item.title}</h3>
                  <p className="mt-2 text-sm text-[var(--ink-2)]">{item.note}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
