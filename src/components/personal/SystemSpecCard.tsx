import { motion, useInView } from "framer-motion";
import { useRef } from "react";

type Props = {
  hostname: string;
  os: string;
  mode: string;
  loops: string;
  health: number;
  modeHeat: number;
};

export default function SystemSpecCard({ hostname, os, mode, loops, health, modeHeat }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const circleCircumference = 2 * Math.PI * 36;
  const healthOffset = circleCircumference * (1 - health);

  return (
    <div
      ref={ref}
      className="grid gap-5 overflow-hidden rounded-3xl border border-border/70 bg-surface/90 p-6 text-text-primary shadow-soft lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
    >
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.12em] text-text-tertiary">System summary</p>
        <div className="grid gap-3 text-sm">
          {[{ label: "Hostname", value: hostname }, { label: "OS", value: os }, { label: "Mode", value: mode }, { label: "Primary loops", value: loops }].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-2xl border border-border/60 bg-surface/80 px-3 py-2"
            >
              <span className="text-text-secondary">{item.label}</span>
              <span className="text-right font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 rounded-3xl border border-border/60 bg-surface/80 p-4">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-text-tertiary">
          <span>Health gauge</span>
          <span className="rounded-full bg-success/10 px-3 py-1 text-[11px] font-semibold text-success">Live</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24">
            <svg viewBox="0 0 96 96" className="h-full w-full" role="img" aria-label="System health gauge">
              <circle cx="48" cy="48" r="36" className="fill-none stroke-border/60" strokeWidth="8" />
              <motion.circle
                cx="48"
                cy="48"
                r="36"
                className="fill-none"
                stroke="url(#healthGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circleCircumference}
                strokeDashoffset={inView ? healthOffset : circleCircumference}
                transition={{ duration: 1.4, ease: "easeOut" }}
                style={{ transformOrigin: "50% 50%", rotate: "-90deg" }}
              />
              <defs>
                <linearGradient id="healthGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-center">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Health</p>
                <p className="text-xl font-semibold">{Math.round(health * 100)}%</p>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-xs uppercase tracking-[0.12em] text-text-tertiary">Mode heat</p>
            <div className="relative h-3 overflow-hidden rounded-full bg-border/60">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary/80 to-secondary/70"
                initial={{ width: "0%" }}
                animate={{ width: inView ? `${Math.round(modeHeat * 100)}%` : "0%" }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
              />
            </div>
            <p className="text-sm text-text-secondary">Home base vs. travel-heavy signals.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
