import { motion, useInView } from "framer-motion";
import { useMemo, useRef } from "react";

type Props = {
  ticks: number;
  filledTicks: number;
  cyclingProgress: number;
  recoveryProgress: number;
  label: string;
};

export default function MovementDial({ ticks, filledTicks, cyclingProgress, recoveryProgress, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const tickArray = useMemo(() => Array.from({ length: ticks }), [ticks]);

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-soft"
    >
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="relative flex items-center justify-center">
          <svg viewBox="-180 -180 360 360" className="h-[360px] w-full">
            <defs>
              <linearGradient id="cycleGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="recoveryGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f472b6" />
              </linearGradient>
            </defs>
            <circle r={120} className="fill-none stroke-white/10" strokeWidth={14} />
            <circle r={88} className="fill-none stroke-white/10" strokeWidth={12} />

            <motion.circle
              r={120}
              className="fill-none"
              stroke="url(#cycleGradient)"
              strokeWidth={14}
              strokeLinecap="round"
              initial={{ pathLength: 0, rotate: -90 }}
              animate={{ pathLength: inView ? cyclingProgress : 0, rotate: -90 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
            <motion.circle
              r={88}
              className="fill-none"
              stroke="url(#recoveryGradient)"
              strokeWidth={12}
              strokeLinecap="round"
              initial={{ pathLength: 0, rotate: -90 }}
              animate={{ pathLength: inView ? recoveryProgress : 0, rotate: -90 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
            />

            {tickArray.map((_, index) => {
              const angle = (index / ticks) * Math.PI * 2 - Math.PI / 2;
              const radius = 140;
              const inner = 118;
              const outerX = Math.cos(angle) * radius;
              const outerY = Math.sin(angle) * radius;
              const innerX = Math.cos(angle) * inner;
              const innerY = Math.sin(angle) * inner;
              const lit = index < filledTicks;
              return (
                <motion.line
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  x1={innerX}
                  y1={innerY}
                  x2={outerX}
                  y2={outerY}
                  stroke={lit ? "#22d3ee" : "rgba(148,163,184,0.35)"}
                  strokeWidth={lit ? 3 : 2}
                  strokeLinecap="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: inView ? (lit ? 1 : 0.6) : 0 }}
                  transition={{ delay: index * 0.03, duration: 0.4 }}
                />
              );
            })}

            <text x={0} y={-6} textAnchor="middle" className="text-[11px] uppercase tracking-[0.18em]" fill="#cbd5e1">
              Cadence
            </text>
            <text x={0} y={14} textAnchor="middle" className="text-3xl font-semibold" fill="#e2e8f0">
              {(cyclingProgress * 100).toFixed(0)}%
            </text>
            <text x={0} y={34} textAnchor="middle" className="text-sm text-[#cbd5e1]">
              Cycling toward ~600 mi
            </text>
          </svg>
          <div className="absolute bottom-8 left-1/2 w-64 -translate-x-1/2 rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm text-text-secondary">
            {label}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">Movement & recovery</p>
          <p className="text-xl font-semibold text-white">A dial for motion and rest</p>
          <p className="text-sm leading-relaxed text-text-secondary">
            Outer ring tracks cycling miles toward a soft ~600mi goal. Inner ring follows recovery fullness. The ticks are the typical month—about ~22 light up when the cadence is right.
          </p>
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-text-secondary">
            <div className="flex items-center justify-between">
              <span className="text-text-tertiary">Cycling goal</span>
              <span className="font-semibold text-white">~420 / ~600 mi</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-tertiary">Recovery index</span>
              <span className="font-semibold text-white">~76% (~0.75 fullness)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-tertiary">Movement rhythm</span>
              <span className="font-semibold text-white">~22 days / month</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
