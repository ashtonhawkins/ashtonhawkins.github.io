import { scaleLinear } from "@visx/scale";
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

const gaugeHeight = 240;

function Sparkline({ values }: { values: number[] }) {
  const width = 180;
  const height = 64;
  const xScale = scaleLinear({ domain: [0, values.length - 1], range: [6, width - 6] });
  const yScale = scaleLinear({ domain: [0, Math.max(...values, 1)], range: [height - 8, 8] });
  const path = values
    .map((value, index) => `${index === 0 ? "M" : "L"}${xScale(index)},${yScale(value)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full" aria-hidden>
      <defs>
        <linearGradient id="spark" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.25} />
          <stop offset="100%" stopColor="#c084fc" stopOpacity={0.25} />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={width} height={height} rx={12} className="fill-surface/60" />
      <path d={`${path} L ${width - 6},${height - 8} L 6,${height - 8} Z`} fill="url(#spark)" />
      <path d={path} stroke="#7dd3fc" strokeWidth={3} fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Odometer({ value }: { value: number }) {
  return (
    <motion.span
      className="font-mono text-3xl font-semibold"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.6 } }}
    >
      <motion.span
        initial={{ innerText: 0 }}
        animate={{ innerText: value }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      >
        {Math.round(value)}
      </motion.span>
    </motion.span>
  );
}

export default function SignalRack({ gauges, chips }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const yScale = useMemo(() => scaleLinear({ domain: [0, 1], range: [gaugeHeight - 10, 12] }), []);

  return (
    <div ref={ref} className="grid gap-6 rounded-3xl border border-border/70 bg-surface/90 p-6 shadow-soft lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-text-tertiary">
          <span>Signal rack</span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">Live</span>
        </div>
        <div className="flex items-end gap-4 overflow-hidden rounded-2xl border border-border/60 bg-surface/80 px-4 pb-4 pt-6">
          {gauges.map((gauge, index) => {
            const barHeight = `${(1 - (yScale(gauge.value) ?? 0) / gaugeHeight) * 100}%`;
            return (
              <div key={gauge.id} className="flex w-full flex-col items-center gap-3 text-center text-sm">
                <div className="relative h-[260px] w-full max-w-[72px] overflow-hidden rounded-[18px] border border-border/60 bg-gradient-to-b from-slate-900/80 to-slate-950/90">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(148,163,184,0.25)_0,_transparent_55%)]" aria-hidden />
                  <motion.div
                    className="absolute bottom-2 left-1/2 w-[38px] -translate-x-1/2 rounded-full bg-gradient-to-t from-primary/80 to-secondary/70"
                    initial={{ height: "0%" }}
                    animate={{ height: inView ? barHeight : "0%" }}
                    transition={{ duration: 1 + index * 0.15, ease: "easeOut" }}
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

      <div className="grid gap-4">
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
    </div>
  );
}
