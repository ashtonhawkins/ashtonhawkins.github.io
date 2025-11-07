import { useEffect, useRef } from "react";
import { meetsEvidenceThreshold } from "../../utils/metrics";

type KPI = {
  key: string;
  label: string;
  value: number;
  sample?: number;
  confidence?: string;
};

const formatValue = (value: number) => {
  if (Math.abs(value) >= 1 && value % 1 !== 0) return value.toFixed(1);
  return value.toString();
};

const animateValue = (node: HTMLElement, finalValue: number) => {
  const duration = 800;
  const start = performance.now();
  const isDecimal = finalValue % 1 !== 0;
  const step = (timestamp: number) => {
    const progress = Math.min(1, (timestamp - start) / duration);
    const current = finalValue * progress;
    node.textContent = isDecimal ? current.toFixed(1) : Math.round(current).toString();
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };
  requestAnimationFrame(step);
};

export default function ScoreboardClient({ kpis }: { kpis: KPI[] }) {
  const refs = useRef<Record<string, HTMLSpanElement | null>>({});

  useEffect(() => {
    const seen = new Set<string>();
    Object.entries(refs.current).forEach(([key, node]) => {
      if (node && !seen.has(key)) {
        seen.add(key);
        const finalValue = Number(node.dataset.final);
        animateValue(node, finalValue);
      }
    });
  }, []);

  return (
    <section className="rounded-3xl border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] bg-[var(--surface-alt)] p-8 shadow-lg shadow-black/10">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--ink)]">Scoreboard</h2>
          <span className="text-xs uppercase tracking-[0.3em] text-[color-mix(in_srgb,var(--ink)_40%,transparent)]">Evidence-led</span>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {kpis
            .filter((kpi) => meetsEvidenceThreshold(kpi.sample, kpi.confidence))
            .map((kpi) => (
              <article
                key={kpi.key}
                className="card relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] bg-gradient-to-br from-[color-mix(in_srgb,var(--surface)_92%,var(--accent)_8%)] to-[var(--surface-alt)] p-6 shadow-inner shadow-black/5"
              >
                <p className="text-sm font-medium text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">{kpi.label}</p>
                <div className="mt-4 flex items-end gap-2">
                  <span
                    ref={(node) => {
                      refs.current[kpi.key] = node;
                    }}
                    data-final={kpi.value}
                    className="text-3xl font-semibold text-[var(--ink)]"
                  >
                    {formatValue(kpi.value)}
                  </span>
                  <span className="text-sm text-[var(--ink-2)]">{kpi.key.includes("pct") || kpi.key.includes("delta") ? "%" : ""}</span>
                </div>
                {kpi.confidence ? (
                  <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] px-3 py-1 text-xs text-[var(--ink-2)]">
                    <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent)]"></span>
                    {kpi.confidence}
                  </span>
                ) : null}
              </article>
            ))}
        </div>
      </div>
    </section>
  );
}
