import { motion, useInView } from "framer-motion";
import { useMemo, useRef } from "react";

type Props = {
  ticks: number;
  filledTicks: number;
  cyclingProgress: number;
  recoveryProgress: number;
  label: string;
};

export default function MovementRecoveryWheel({ ticks, filledTicks, cyclingProgress, recoveryProgress, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const tickAngles = useMemo(() => Array.from({ length: ticks }, (_, i) => (i / ticks) * Math.PI * 2 - Math.PI / 2), [ticks]);

  const radius = 120;

  return (
    <div
      ref={ref}
      className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-surface/90 p-6 shadow-soft"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">Movement & recovery</h2>
          <p className="text-text-secondary">Circular readout of cadence, cycling, and recovery.</p>
        </div>
        <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">Approximate</span>
      </div>
      <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center lg:justify-center">
        <svg viewBox="0 0 320 320" className="h-[320px] w-[320px] max-w-full" role="img" aria-label="Movement and recovery wheel">
          <circle cx={160} cy={160} r={radius} className="fill-none stroke-border/60" strokeWidth={2} strokeDasharray="2 10" />
          <motion.circle
            cx={160}
            cy={160}
            r={80}
            className="fill-none stroke-primary/60"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 80}
            strokeDashoffset={(1 - (inView ? cyclingProgress : 0)) * 2 * Math.PI * 80}
            style={{ transformOrigin: "50% 50%", rotate: "-90deg" }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
          <motion.circle
            cx={160}
            cy={160}
            r={60}
            className="fill-none stroke-secondary/60"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 60}
            strokeDashoffset={(1 - (inView ? recoveryProgress : 0)) * 2 * Math.PI * 60}
            style={{ transformOrigin: "50% 50%", rotate: "-90deg" }}
            transition={{ duration: 1.1, ease: "easeOut", delay: 0.1 }}
          />
          {tickAngles.map((angle, index) => {
            const inner = radius - 8;
            const outer = radius + 10;
            const cx = 160 + Math.cos(angle) * inner;
            const cy = 160 + Math.sin(angle) * inner;
            const tx = 160 + Math.cos(angle) * outer;
            const ty = 160 + Math.sin(angle) * outer;
            const isFilled = index < filledTicks;
            return (
              <motion.line
                key={angle}
                x1={cx}
                y1={cy}
                x2={tx}
                y2={ty}
                stroke={isFilled ? "#22d3ee" : "rgba(148,163,184,0.5)"}
                strokeWidth={isFilled ? 3 : 2}
                initial={{ opacity: 0 }}
                animate={{ opacity: inView ? 1 : 0 }}
                transition={{ delay: index * 0.02, duration: 0.4 }}
              />
            );
          })}
          <text x={160} y={154} textAnchor="middle" className="text-xs uppercase tracking-[0.12em]" fill="#94a3b8">
            Month wheel
          </text>
          <text x={160} y={176} textAnchor="middle" className="text-lg font-semibold" fill="#e2e8f0">
            {filledTicks} days active
          </text>
        </svg>
        <div className="max-w-sm text-center lg:text-left">
          <p className="text-sm text-text-secondary">{label}</p>
          <p className="mt-2 rounded-2xl border border-border/60 bg-surface/80 px-4 py-3 text-xs uppercase tracking-[0.1em] text-text-tertiary">
            Outer ring: cycling progress · Inner ring: recovery fullness
          </p>
        </div>
      </div>
    </div>
  );
}
