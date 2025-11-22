import { motion, useInView } from "framer-motion";
import { useMemo, useRef } from "react";

type Gauge = {
  id: string;
  label: string;
  value: number;
  detail: string;
  description: string;
};

type Chip = {
  id: string;
  label: string;
  value: number;
  subtitle: string;
  sparkline: number[];
};

type Props = {
  gauges: Gauge[];
  chips: Chip[];
};

const gaugeHeight = 260;

const linearScale = (value: number, domain: [number, number], range: [number, number]) => {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d1 === d0) return r0;
  const ratio = (value - d0) / (d1 - d0);
  return r0 + ratio * (r1 - r0);
};

function Sparkline({ values }: { values: number[] }) {
  const width = 220;
  const height = 74;
  const xScale = (index: number) => linearScale(index, [0, values.length - 1], [8, width - 8]);
  const yScale = (value: number) => linearScale(value, [0, Math.max(...values, 1)], [height - 10, 10]);
  const path = values
    .map((value, index) => `${index === 0 ? "M" : "L"}${xScale(index)},${yScale(value)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[76px] w-full" aria-hidden>
      <defs>
        <linearGradient id="spark" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.2} />
          <stop offset="50%" stopColor="#c084fc" stopOpacity={0.16} />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.2} />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={width} height={height} rx={14} className="fill-surface/60" />
      <path d={`${path} L ${width - 8},${height - 10} L 8,${height - 10} Z`} fill="url(#spark)" />
      <path d={path} stroke="#7dd3fc" strokeWidth={3} fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Odometer({ value }: { value: number }) {
  return (
    <motion.div
      className="flex items-end gap-1 font-mono text-4xl font-semibold"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.6 } }}
    >
      <motion.span
        initial={{ innerText: 0 }}
        animate={{ innerText: value }}
        transition={{ duration: 1.15, ease: "easeOut" }}
      >
        {Math.round(value)}
      </motion.span>
      <span className="text-lg text-text-tertiary">YTD</span>
    </motion.div>
  );
}

export default function SignalRack({ gauges, chips }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const yScale = useMemo(() => (value: number) => linearScale(value, [0, 1], [gaugeHeight - 10, 12]), []);

  return (
    <section
      ref={ref}
      className="grid gap-6 rounded-3xl border border-border/70 bg-surface/90 p-6 shadow-soft lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-text-tertiary">
          <span>Signal rack</span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">Live</span>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface/80 px-4 pb-5 pt-6">
          <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_92%,rgba(148,163,184,0.08)_92%),linear-gradient(90deg,transparent_88%,rgba(148,163,184,0.08)_88%)] bg-[size:22px_26px] opacity-60" aria-hidden />
          <div className="relative flex items-end gap-4">
            {gauges.map((gauge, index) => {
              const barHeight = `${(1 - (yScale(gauge.value) ?? 0) / gaugeHeight) * 100}%`;
              return (
                <div key={gauge.id} className="flex w-full flex-col items-center gap-3 text-center text-sm">
                  <div className="relative h-[280px] w-full max-w-[92px] overflow-hidden rounded-[18px] border border-border/60 bg-gradient-to-b from-slate-900/80 to-slate-950/90">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(148,163,184,0.28)_0,_transparent_55%)]" aria-hidden />
                    <motion.div
                      className="absolute bottom-3 left-1/2 w-[46px] -translate-x-1/2 rounded-[14px] bg-gradient-to-t from-primary/80 via-secondary/70 to-amber-200/70 shadow-lg shadow-primary/20"
                      initial={{ height: "0%" }}
                      animate={{ height: inView ? barHeight : "0%" }}
                      transition={{ duration: 1 + index * 0.2, ease: "easeOut" }}
                      aria-hidden
                    />
                    <div className="absolute inset-2 rounded-[14px] border border-border/40" aria-hidden />
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[0.08em] text-text-tertiary">
                      {gauge.detail}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">{gauge.label}</p>
                    <p className="text-sm text-text-secondary">{gauge.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-slate-950 via-surface/90 to-slate-950 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-text-tertiary">Hero metrics</p>
          <p className="text-sm text-text-secondary">Live gauges + year-to-date trend readouts.</p>
        </div>
        {chips.map((chip, index) => (
          <div
            key={chip.id}
            className="relative overflow-hidden rounded-3xl border border-border/60 bg-surface/80 p-5 shadow-soft"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-text-tertiary">{chip.label}</p>
                <Odometer value={inView ? chip.value : 0} />
              </div>
              <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-semibold text-text-secondary ring-1 ring-border/70">
                {chip.subtitle}
              </span>
            </div>
            <div className="mt-3">
              <Sparkline values={chip.sparkline} />
            </div>
            <motion.div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5"
              initial={{ opacity: 0 }}
              animate={{ opacity: inView ? 1 : 0 }}
              transition={{ delay: 0.2 + index * 0.1, duration: 0.8 }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
