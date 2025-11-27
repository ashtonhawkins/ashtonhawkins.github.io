import { motion, useInView, useReducedMotion } from "framer-motion";
import { useMemo, useRef } from "react";

type Props = {
  hostname: string;
  os: string;
  mode: string;
  loops: string;
  health: number;
  modeHeat: number;
  summary: string;
  interpretation: string;
};

export default function SystemSpecCard({ hostname, os, mode, loops, health, modeHeat, summary, interpretation }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const prefersReducedMotion = useReducedMotion();

  const circleCircumference = 2 * Math.PI * 36;
  const healthOffset = circleCircumference * (1 - health);

  const gaugeColor = useMemo(() => {
    if (health >= 0.8) return "#22d3ee";
    if (health >= 0.65) return "#a78bfa";
    return "#fbbf24";
  }, [health]);

  return (
    <section
      ref={ref}
      className="grid gap-5 overflow-hidden rounded-3xl border border-border/70 bg-surface/90 p-6 text-text-primary shadow-soft lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
      aria-label="System summary card"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.12em] text-text-tertiary">System summary</p>
            <h2 className="text-xl font-semibold text-text-primary">Hostname: {hostname}</h2>
          </div>
          <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-semibold text-text-secondary ring-1 ring-border/70">
            {os}
          </span>
        </div>
        <div className="grid gap-3 text-sm">
          {[{ label: "Mode", value: mode }, { label: "Primary loops", value: loops }].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-2xl border border-border/60 bg-surface/80 px-3 py-2"
            >
              <span className="text-text-secondary">{item.label}</span>
              <span className="text-right font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-text-secondary">{summary}</p>
      </div>

      <div className="grid gap-4 rounded-3xl border border-border/60 bg-surface/80 p-4">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-text-tertiary">
          <span>Health gauge</span>
          <span className="rounded-full bg-success/10 px-3 py-1 text-[11px] font-semibold text-success">78%</span>
        </div>
        <div className="flex items-center gap-5 lg:gap-6">
          <div className="relative h-28 w-28">
            <svg viewBox="0 0 112 112" className="h-full w-full" role="img" aria-label="System health gauge">
              <circle cx="56" cy="56" r="42" className="fill-none stroke-border/60" strokeWidth="9" />
              <motion.circle
                cx="56"
                cy="56"
                r="42"
                className="fill-none"
                stroke={gaugeColor}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={circleCircumference}
                strokeDashoffset={inView ? healthOffset : circleCircumference}
                transition={{ duration: prefersReducedMotion ? 0 : 1.4, ease: "easeOut" }}
                style={{ transformOrigin: "50% 50%", rotate: "-90deg" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-center">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Health</p>
                <p className="text-xl font-semibold">{Math.round(health * 100)}%</p>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-text-tertiary">
              <span>Mode heat</span>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">{Math.round(modeHeat * 100)}%</span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-border/60" aria-label="Home base vs travel-heavy indicator">
              <motion.div
                className="absolute left-0 top-0 h-full w-full"
                initial={{ x: "-100%" }}
                animate={{ x: inView ? "0%" : "-100%" }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.8, ease: "easeOut" }}
              >
                <div className="relative h-full w-full rounded-full bg-gradient-to-r from-primary/60 via-secondary/60 to-amber-300/70">
                  <motion.div
                    className="absolute -top-1 h-5 w-5 rounded-full border-2 border-background bg-surface shadow-soft"
                    initial={{ left: "8%" }}
                    animate={{ left: `${Math.round(modeHeat * 100)}%` }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.8, ease: "easeOut", delay: 0.1 }}
                  />
                </div>
              </motion.div>
            </div>
            <div className="flex items-center justify-between text-sm text-text-secondary">
              <span>Home base</span>
              <span>Travel-heavy</span>
            </div>
            <p className="text-sm text-text-secondary">{interpretation}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
