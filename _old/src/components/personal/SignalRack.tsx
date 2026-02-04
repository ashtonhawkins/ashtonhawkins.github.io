import { motion, useInView, useReducedMotion } from "framer-motion";
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

export default function SignalRack({ gauges, chips }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const prefersReducedMotion = useReducedMotion();

  const progress = useMemo(() => gauges.map((gauge) => Math.max(0, Math.min(1, gauge.value))), [gauges]);

  return (
    <section
      ref={ref}
      className="grid gap-5 rounded-3xl border border-border/70 bg-surface/90 p-6 shadow-soft"
      aria-label="Signal rack showing key metrics"
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-text-tertiary">
        <span>Signal rack</span>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">Live snapshot</span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid auto-cols-[minmax(220px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
          {gauges.map((gauge, index) => (
            <article
              key={gauge.id}
              className="relative flex h-full flex-col gap-2 rounded-2xl border border-border/70 bg-surface/80 p-4 shadow-soft"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-text-primary">{gauge.label}</p>
                <span className="text-xs uppercase tracking-[0.1em] text-text-tertiary">{gauge.detail}</span>
              </div>
              <p className="text-sm text-text-secondary">{gauge.description}</p>
              <div className="relative mt-auto h-3 overflow-hidden rounded-full bg-border/70" aria-hidden>
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary/70 to-secondary/60"
                  initial={{ width: 0 }}
                  animate={{ width: inView ? `${Math.round(progress[index] * 100)}%` : 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.9, ease: "easeOut", delay: index * 0.08 }}
                />
              </div>
              <p className="text-xs text-text-tertiary">Approx. {Math.round(progress[index] * 100)}% of target</p>
            </article>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {chips.map((chip, index) => (
            <div
              key={chip.id}
              className="group relative flex flex-col gap-2 overflow-hidden rounded-3xl border border-border/60 bg-surface/80 p-5 shadow-soft focus-within:ring-2 focus-within:ring-primary"
              tabIndex={0}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-text-tertiary">{chip.label}</p>
                  <motion.p
                    className="font-mono text-3xl font-semibold text-text-primary"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 8 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    aria-live="polite"
                  >
                    {Math.round(inView ? chip.value : 0)}
                  </motion.p>
                </div>
                <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-semibold text-text-secondary ring-1 ring-border/70">
                  {chip.subtitle}
                </span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-border/60" aria-hidden>
                <motion.div
                  className="h-full w-full bg-gradient-to-r from-primary/20 via-secondary/20 to-amber-200/30"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: inView ? 1 : 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.9, ease: "easeOut" }}
                  style={{ transformOrigin: "0 50%" }}
                />
              </div>
              <motion.div
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5"
                initial={{ opacity: 0 }}
                animate={{ opacity: inView ? 1 : 0.4 }}
                transition={{ delay: 0.2 + index * 0.1, duration: prefersReducedMotion ? 0 : 0.8 }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
