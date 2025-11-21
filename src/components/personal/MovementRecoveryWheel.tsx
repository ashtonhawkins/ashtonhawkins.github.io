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

  const radius = 130;

  return (
    <div ref={ref} className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-surface/90 p-6 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">Movement & recovery</h2>
          <p className="text-text-secondary">Circular readout of cadence, cycling, and recovery.</p>
        </div>
        <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">Approximate</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        <div className="relative flex justify-center">
          <svg viewBox="0 0 340 340" className="h-[340px] w-[340px] max-w-full" role="img" aria-label="Movement and recovery wheel">
            <circle cx={170} cy={170} r={radius} className="fill-none stroke-border/60" strokeWidth={2} strokeDasharray="2 10" />
            <circle cx={170} cy={170} r={radius + 14} className="fill-none stroke-border/40" strokeDasharray="4 16" />
            <motion.circle
              cx={170}
              cy={170}
              r={95}
              className="fill-none stroke-primary/60"
              strokeWidth={12}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 95}
              strokeDashoffset={(1 - (inView ? cyclingProgress : 0)) * 2 * Math.PI * 95}
              style={{ transformOrigin: "50% 50%", rotate: "-90deg" }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
            <motion.circle
              cx={170}
              cy={170}
              r={70}
              className="fill-none stroke-secondary/60"
              strokeWidth={12}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 70}
              strokeDashoffset={(1 - (inView ? recoveryProgress : 0)) * 2 * Math.PI * 70}
              style={{ transformOrigin: "50% 50%", rotate: "-90deg" }}
              transition={{ duration: 1.1, ease: "easeOut", delay: 0.1 }}
            />
            {tickAngles.map((angle, index) => {
              const inner = radius - 10;
              const outer = radius + 12;
              const cx = 170 + Math.cos(angle) * inner;
              const cy = 170 + Math.sin(angle) * inner;
              const tx = 170 + Math.cos(angle) * outer;
              const ty = 170 + Math.sin(angle) * outer;
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
                  transition={{ delay: index * 0.03, duration: 0.4 }}
                />
              );
            })}
            <motion.circle
              cx={170}
              cy={170}
              r={42}
              className="fill-surface/80 stroke-border/60"
              animate={{ scale: inView ? 1 : 0.92, opacity: inView ? 1 : 0.8 }}
            />
            <text x={170} y={162} textAnchor="middle" className="text-xs uppercase tracking-[0.12em]" fill="#94a3b8">
              Month wheel
            </text>
            <text x={170} y={182} textAnchor="middle" className="text-lg font-semibold" fill="#e2e8f0">
              {filledTicks} days active
            </text>
            <text x={170} y={202} textAnchor="middle" className="text-[11px] uppercase tracking-[0.08em]" fill="#cbd5e1">
              cycling 70% · recovery 76%
            </text>
          </svg>
        </div>
        <div className="space-y-3 rounded-2xl border border-border/60 bg-surface/80 p-4">
          <p className="text-sm text-text-secondary">{label}</p>
          <div className="grid grid-cols-2 gap-3 text-xs uppercase tracking-[0.1em] text-text-tertiary">
            <div className="rounded-xl border border-border/60 bg-surface px-3 py-2">
              <p>Cycling cadence</p>
              <p className="text-base font-semibold text-text-primary">~70% of goal</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-surface px-3 py-2">
              <p>Recovery steadiness</p>
              <p className="text-base font-semibold text-text-primary">~76% fullness</p>
            </div>
          </div>
          <p className="rounded-2xl border border-border/60 bg-surface/90 px-4 py-3 text-xs uppercase tracking-[0.1em] text-text-tertiary">
            Outer ticks: movement days · Middle arc: cycling progress · Inner arc: recovery fullness
          </p>
        </div>
      </div>
    </div>
  );
}
