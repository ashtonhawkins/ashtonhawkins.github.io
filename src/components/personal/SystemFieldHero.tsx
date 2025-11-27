import { motion, useReducedMotion } from "framer-motion";
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

type Point = {
  x: number;
  y: number;
  size: number;
};

const GRID_LINES = Array.from({ length: 12 }, (_, i) => i / 11);

function generateClusterPoints(seed: number, centerX: number, centerY: number) {
  return Array.from({ length: 26 }, (_, index) => {
    const angle = (index / 26) * Math.PI * 2 + seed * 0.35;
    const radius = 28 + ((index * 13 + seed * 17) % 24);
    return {
      x: centerX + Math.cos(angle) * radius + (Math.sin(seed + index) * 6),
      y: centerY + Math.sin(angle) * radius + (Math.cos(seed + index) * 6),
      size: 2 + ((index + seed) % 3),
    } satisfies Point;
  });
}

export default function SystemFieldHero({ title, version, stability, clusters }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const positions = useMemo(
    () => [
      { x: 220, y: 210 },
      { x: 620, y: 160 },
      { x: 960, y: 260 },
      { x: 760, y: 360 },
    ],
    [],
  );

  const clusterPoints = useMemo(
    () =>
      clusters.map((cluster, index) =>
        generateClusterPoints(index * 3 + 1, positions[index]?.x ?? 200, positions[index]?.y ?? 180),
      ),
    [clusters, positions],
  );

  const activeCluster = clusters.find((cluster) => cluster.id === active);

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-border/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white shadow-overlay">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.08)_0,_transparent_42%),_radial-gradient(circle_at_30%_70%,_rgba(192,132,252,0.08)_0,_transparent_32%),_radial-gradient(circle_at_76%_70%,_rgba(251,191,36,0.08)_0,_transparent_32%)]" aria-hidden />
      <svg
        viewBox="0 0 1200 500"
        role="img"
        aria-labelledby="system-field-title"
        aria-describedby="system-field-desc"
        className="h-full w-full"
      >
        <title id="system-field-title">System field: which parts of my life are loudest right now.</title>
        <desc id="system-field-desc">
          Interactive cluster map showing movement, exploration, recovery, and product & systems signals with brighter halos when a
          cluster is focused.
        </desc>
        <defs>
          <linearGradient id="grid-line" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(148,163,184,0.24)" />
            <stop offset="100%" stopColor="rgba(148,163,184,0.08)" />
          </linearGradient>
        </defs>

        {GRID_LINES.map((t) => (
          <line key={`v-${t}`} x1={t * 1200} x2={t * 1200} y1={0} y2={500} stroke="url(#grid-line)" strokeWidth={0.5} />
        ))}
        {GRID_LINES.map((t) => (
          <line key={`h-${t}`} x1={0} x2={1200} y1={t * 500} y2={t * 500} stroke="url(#grid-line)" strokeWidth={0.5} />
        ))}

        {clusters.map((cluster, clusterIndex) => (
          <g
            key={cluster.id}
            className="transition duration-300"
            role="button"
            tabIndex={0}
            aria-pressed={active === cluster.id}
            aria-label={`Focus ${cluster.label} cluster`}
            onMouseEnter={() => setActive(cluster.id)}
            onFocus={() => setActive(cluster.id)}
            onBlur={() => setActive(null)}
            onMouseLeave={() => setActive(null)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setActive(cluster.id);
              }

              if (event.key === "Escape") {
                setActive(null);
              }
            }}
          >
            {clusterPoints[clusterIndex]?.map((point, index) => (
              <motion.circle
                key={`${cluster.id}-${index}`}
                cx={point.x}
                cy={point.y}
                r={point.size + 1}
                className="mix-blend-screen"
                style={{ filter: "drop-shadow(0 0 12px rgba(255,255,255,0.35))" }}
                fill={cluster.color}
                initial={{ opacity: 0.08, scale: prefersReducedMotion ? 1 : 0.9 }}
                animate={
                  prefersReducedMotion
                    ? { opacity: active === cluster.id ? 0.8 : 0.45, scale: active === cluster.id ? 1.04 : 1 }
                    : {
                        opacity: [0.12, 0.4, 0.16],
                        scale: [0.94, 1.08, 0.98],
                        x: [0, (index % 3) - 1.5, (index % 2) - 0.8],
                        y: [0, ((index + 1) % 3) - 1.5, ((index + 2) % 2) - 0.6],
                      }
                }
                transition={{
                  duration: prefersReducedMotion ? 0.3 : 4.5 + (index % 6) * 0.2,
                  repeat: prefersReducedMotion ? 0 : Infinity,
                  ease: "easeInOut",
                  delay: prefersReducedMotion ? 0 : index * 0.015,
                }}
                opacity={active === cluster.id ? 0.8 : 0.5}
              />
            ))}
            <motion.circle
              cx={positions[clusterIndex]?.x ?? 0}
              cy={positions[clusterIndex]?.y ?? 0}
              r={18 + cluster.value * 30}
              fill={cluster.color}
              fillOpacity={0.12}
              stroke={cluster.color}
              strokeOpacity={0.35}
              animate={{ scale: active === cluster.id ? 1.08 : 1 }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            />
            <motion.text
              x={(positions[clusterIndex]?.x ?? 0) + 14}
              y={(positions[clusterIndex]?.y ?? 0) - 18}
              className="text-sm font-semibold"
              fill="#e2e8f0"
              initial={{ opacity: 0 }}
              animate={{ opacity: active === cluster.id ? 1 : 0.6 }}
            >
              {cluster.label}
            </motion.text>
          </g>
        ))}

        <g transform="translate(520 186)">
          <rect
            x={0}
            y={0}
            width={200}
            height={140}
            rx={18}
            className="fill-slate-900/70"
            stroke="rgba(148,163,184,0.35)"
          />
          <motion.rect
            x={6}
            y={6}
            width={188}
            height={128}
            rx={14}
            fill="url(#grid-line)"
            opacity={0.12}
            animate={{ opacity: active ? 0.2 : 0.12 }}
          />
          <text x={22} y={38} className="text-[12px] uppercase tracking-[0.24em]" fill="#94a3b8">
            {title} · {version}
          </text>
          <text x={22} y={64} className="text-[22px] font-semibold tracking-tight" fill="#e2e8f0">
            ASHTON — {stability}
          </text>
          <text x={22} y={92} className="text-[12px] uppercase tracking-[0.18em]" fill="#cbd5e1">
            {activeCluster ? `${activeCluster.label}: ${activeCluster.detail}` : "Movement · Exploration · Recovery online"}
          </text>
          <text x={22} y={118} className="text-[11px] tracking-[0.08em]" fill="#94a3b8">
            Hover or focus a cluster to brighten its signal
          </text>
        </g>
      </svg>
    </div>
  );
}
