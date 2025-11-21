import { motion, useInView } from "framer-motion";
import { useMemo, useRef } from "react";

export type Gauge = {
  id: string;
  label: string;
  value: number;
  detail: string;
  descriptor: string;
};

export type HeroMetric = {
  id: string;
  label: string;
  value: number;
  subtitle: string;
  sparkline: number[];
};

type Props = {
  gauges: Gauge[];
  heroMetrics: HeroMetric[];
};

const barHeights = [180, 180, 180];

function Sparkline({ values }: { values: number[] }) {
  const width = 120;
  const height = 48;
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * width;
      const y = height - v * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-12 w-full">
      <polyline
        points={points}
        fill="none"
        className="stroke-cyan-300/70"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <polyline
        points={`${points}`}
        fill="none"
        className="stroke-white/20"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SignalGrid({ gauges, heroMetrics }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const normalizedGauges = useMemo(
    () => gauges.map((gauge, index) => ({ ...gauge, height: barHeights[index] ?? 160 })),
    [gauges],
  );

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-soft"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.1)_1px,transparent_1px),linear-gradient(180deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:80px_80px] opacity-70"
        aria-hidden
      />
      <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="grid grid-cols-3 gap-4">
          {normalizedGauges.map((gauge) => (
            <div key={gauge.id} className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-3 pb-4">
              <div className="relative h-[200px] w-20 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
                <div className="absolute inset-x-2 top-3 h-[184px] bg-[repeating-linear-gradient(180deg,rgba(148,163,184,0.15),rgba(148,163,184,0.15)_1px,transparent_1px,transparent_12px)]" />
                <motion.div
                  className="absolute inset-x-3 bottom-3 rounded-xl bg-gradient-to-t from-cyan-400/70 via-cyan-300/70 to-indigo-300/60 shadow-[0_0_30px_rgba(34,211,238,0.25)]"
                  initial={{ height: 0 }}
                  animate={{ height: inView ? `${Math.max(8, gauge.value * 100)}%` : 0 }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                  style={{ maxHeight: gauge.height }}
                />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-white">{Math.round(gauge.value * 100)}%</p>
                <p className="text-sm text-text-secondary">{gauge.detail}</p>
              </div>
              <p className="text-center text-xs uppercase tracking-[0.16em] text-text-tertiary">{gauge.label}</p>
              <p className="text-center text-xs text-text-secondary">{gauge.descriptor}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4">
          {heroMetrics.map((metric) => (
            <div
              key={metric.id}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-soft"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">{metric.label}</p>
                  <p className="text-3xl font-semibold text-white">{metric.value}+</p>
                  <p className="text-sm text-text-secondary">{metric.subtitle}</p>
                </div>
                <div className="w-28 text-right text-xs text-text-tertiary">Trending</div>
              </div>
              <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-2">
                <Sparkline values={metric.sparkline} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
