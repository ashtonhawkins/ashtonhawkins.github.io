import { motion } from "framer-motion";
import { useMemo, useState } from "react";

export type SystemCluster = {
  id: string;
  label: string;
  value: number;
  detail: string;
  description: string;
  color: string;
};

type Props = {
  title: string;
  version: string;
  stability: string;
  clusters: SystemCluster[];
};

const GRID_LINES = Array.from({ length: 14 }, (_, i) => i / 13);

function arcPath(radius: number, value: number) {
  const startAngle = -Math.PI / 2;
  const sweep = Math.PI * 2 * value;
  const endAngle = startAngle + sweep;

  const startX = 0 + radius * Math.cos(startAngle);
  const startY = 0 + radius * Math.sin(startAngle);
  const endX = 0 + radius * Math.cos(endAngle);
  const endY = 0 + radius * Math.sin(endAngle);

  const largeArc = sweep > Math.PI ? 1 : 0;

  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;
}

export default function SystemFieldHero({ title, version, stability, clusters }: Props) {
  const [active, setActive] = useState(clusters[0]?.id ?? "");

  const rings = useMemo(
    () =>
      clusters.map((cluster, index) => ({
        ...cluster,
        radius: 120 + index * 46,
      })),
    [clusters],
  );

  const activeCluster = rings.find((cluster) => cluster.id === active) ?? rings[0];

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-border/70 bg-slate-950 text-white shadow-overlay">
      <div
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(180deg,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:80px_80px]"
        aria-hidden
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(34,211,238,0.14),transparent_32%),radial-gradient(circle_at_82%_20%,rgba(192,132,252,0.14),transparent_36%),radial-gradient(circle_at_50%_80%,rgba(251,191,36,0.12),transparent_40%)]" />

      <div className="relative grid gap-6 p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">{title}</p>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold sm:text-4xl">Personal OS · Ashton Hawkins</h1>
            <p className="text-lg text-text-secondary">Movement, exploration, and recovery sensors online.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-text-secondary">
            <span className="rounded-full bg-white/5 px-3 py-1 text-sm font-semibold text-white/90">{version}</span>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-100">
              {stability}
            </span>
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-50">
              Movement · Exploration · Recovery
            </span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-text-secondary">
            The core stays steady: movement most days, sleep in the mid-7s, curiosity running high without over-tracking.
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-text-secondary">
            Hover any sensor to see its current read. Each arc thickens and pulses to mirror the load.
          </div>
        </div>

        <div className="relative">
          <svg viewBox="-260 -260 520 520" className="h-full w-full">
            <defs>
              <linearGradient id="ringGlow" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(34,211,238,0.35)" />
                <stop offset="50%" stopColor="rgba(192,132,252,0.35)" />
                <stop offset="100%" stopColor="rgba(251,191,36,0.35)" />
              </linearGradient>
            </defs>
            {GRID_LINES.map((t) => (
              <line key={`v-${t}`} x1={(t - 0.5) * 520} x2={(t - 0.5) * 520} y1={-260} y2={260} stroke="rgba(148,163,184,0.2)" strokeWidth={0.5} />
            ))}
            {GRID_LINES.map((t) => (
              <line key={`h-${t}`} x1={-260} x2={260} y1={(t - 0.5) * 520} y2={(t - 0.5) * 520} stroke="rgba(148,163,184,0.2)" strokeWidth={0.5} />
            ))}

            <circle r={28} className="fill-slate-950/70 stroke-white/10" />
            <motion.circle
              r={42}
              className="fill-none"
              stroke="url(#ringGlow)"
              strokeWidth={1.5}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.04, 1] }}
              transition={{ repeat: Infinity, duration: 7 }}
            />
            <motion.g initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.8 }}>
              <rect x={-110} y={-20} width={220} height={56} rx={16} className="fill-slate-900/90 stroke-white/10" />
              <text x={0} y={-2} textAnchor="middle" className="text-[12px] uppercase tracking-[0.18em]" fill="#cbd5e1">
                {title} · {version}
              </text>
              <text x={0} y={16} textAnchor="middle" className="text-[13px] font-semibold tracking-[0.14em]" fill="#e2e8f0">
                {stability}
              </text>
              <text x={0} y={34} textAnchor="middle" className="text-[10px] uppercase tracking-[0.14em]" fill="#94a3b8">
                Movement · Exploration · Recovery online
              </text>
            </motion.g>

            {rings.map((ring) => {
              const isActive = active === ring.id;
              return (
                <motion.g
                  key={ring.id}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer focus:outline-none"
                  onMouseEnter={() => setActive(ring.id)}
                  onFocus={() => setActive(ring.id)}
                  onMouseLeave={() => setActive(rings[0]?.id ?? ring.id)}
                  onBlur={() => setActive(rings[0]?.id ?? ring.id)}
                  animate={{ opacity: isActive ? 1 : 0.62 }}
                >
                  <circle r={ring.radius} className="fill-none stroke-white/10" strokeWidth={2} strokeDasharray="6 10" />
                  <motion.path
                    d={arcPath(ring.radius, Math.max(ring.value * 0.92, 0.1))}
                    fill="none"
                    stroke={ring.color}
                    strokeLinecap="round"
                    strokeWidth={isActive ? 16 : 11}
                    strokeOpacity={0.75}
                    initial={{ pathLength: 0 }}
                    animate={{
                      pathLength: 1,
                      opacity: isActive ? 1 : 0.65,
                      filter: isActive ? "drop-shadow(0 0 12px rgba(255,255,255,0.45))" : "none",
                    }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                  <motion.circle
                    r={ring.radius}
                    className="fill-none"
                    stroke={ring.color}
                    strokeWidth={isActive ? 3 : 2}
                    strokeOpacity={0.2}
                    animate={{ rotate: isActive ? 6 : 0 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.text
                    y={-ring.radius + 18}
                    textAnchor="middle"
                    className="text-sm font-semibold"
                    fill="#e2e8f0"
                    animate={{ opacity: isActive ? 1 : 0.65 }}
                  >
                    {ring.label}
                  </motion.text>
                </motion.g>
              );
            })}
          </svg>

          <motion.div
            className="absolute right-4 top-4 w-60 rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-2xl backdrop-blur"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">System core</p>
            <p className="text-lg font-semibold text-white">ASHTON — Stable</p>
            <p className="text-sm text-text-secondary">Movement, exploration, and recovery sensors online.</p>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">{activeCluster?.label}</p>
              <p className="text-sm text-white">{activeCluster?.description}</p>
              <p className="text-sm text-cyan-100">{activeCluster?.detail}</p>
            </div>
            <div className="mt-3 grid gap-1 text-[11px] uppercase tracking-[0.14em] text-text-tertiary">
              <span>Movement: ~420 / ~600 mi</span>
              <span>Exploration: airport-opinionated (~82%)</span>
              <span>Recovery: ~0.75 fullness (~76%)</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
