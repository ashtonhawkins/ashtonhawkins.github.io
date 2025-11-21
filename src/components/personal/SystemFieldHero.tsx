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

type Point = {
  x: number;
  y: number;
  size: number;
};

const GRID_LINES = Array.from({ length: 14 }, (_, i) => i / 13);

function generateClusterPoints(seed: number, centerX: number, centerY: number) {
  return Array.from({ length: 32 }, (_, index) => {
    const angle = (index / 32) * Math.PI * 2 + seed * 0.4;
    const radius = 34 + ((index * 11 + seed * 19) % 28);
    return {
      x: centerX + Math.cos(angle) * radius + (Math.sin(seed + index) * 6),
      y: centerY + Math.sin(angle) * radius + (Math.cos(seed + index) * 6),
      size: 2 + ((index + seed) % 3),
    } satisfies Point;
  });
}

export default function SystemFieldHero({ title, version, stability, clusters }: Props) {
  const [active, setActive] = useState<string | null>(null);

  const positions = useMemo(
    () => [
      { x: 320, y: 220 },
      { x: 600, y: 180 },
      { x: 880, y: 240 },
    ],
    [],
  );

  const radii = useMemo(() => [120, 168, 220], []);

  const clusterPoints = useMemo(
    () =>
      clusters.map((cluster, index) =>
        generateClusterPoints(index * 3 + 1, positions[index]?.x ?? 320, positions[index]?.y ?? 220),
      ),
    [clusters, positions],
  );

  const activeCluster = clusters.find((cluster) => cluster.id === active) ?? clusters[0];

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-border/70 bg-slate-950 text-white shadow-overlay">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:90px_90px]" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.14),transparent_32%),radial-gradient(circle_at_80%_30%,rgba(192,132,252,0.14),transparent_34%),radial-gradient(circle_at_50%_80%,rgba(251,191,36,0.12),transparent_40%)]" aria-hidden />
      <svg viewBox="0 0 1180 520" role="img" aria-labelledby="system-field-title" className="h-full w-full">
        <title id="system-field-title">System field with premium rings for movement, exploration, and recovery.</title>
        <defs>
          <linearGradient id="grid-line" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(148,163,184,0.3)" />
            <stop offset="100%" stopColor="rgba(148,163,184,0.08)" />
          </linearGradient>
        </defs>

        {GRID_LINES.map((t) => (
          <line key={`v-${t}`} x1={t * 1180} x2={t * 1180} y1={0} y2={520} stroke="url(#grid-line)" strokeWidth={0.5} />
        ))}
        {GRID_LINES.map((t) => (
          <line key={`h-${t}`} x1={0} x2={1180} y1={t * 520} y2={t * 520} stroke="url(#grid-line)" strokeWidth={0.5} />
        ))}

        <g transform="translate(340 260)">
          <circle cx={0} cy={0} r={240} className="fill-none stroke-border/40" strokeDasharray="6 8" />
          <circle cx={0} cy={0} r={260} className="fill-none stroke-border/30" strokeDasharray="4 14" />
          <circle cx={0} cy={0} r={90} className="fill-slate-900/70 stroke-border/40" />
          <motion.rect
            x={-86}
            y={-18}
            width={172}
            height={52}
            rx={15}
            className="fill-slate-900/90"
            stroke="rgba(148,163,184,0.5)"
            animate={{ opacity: active ? 1 : 0.8, scale: active ? 1.02 : 1 }}
          />
          <text x={0} y={-2} textAnchor="middle" className="text-[12px] uppercase tracking-[0.2em]" fill="#cbd5e1">
            {title} · {version}
          </text>
          <text x={0} y={16} textAnchor="middle" className="text-[14px] font-semibold tracking-[0.18em]" fill="#e2e8f0">
            {stability}
          </text>
          <text x={0} y={36} textAnchor="middle" className="text-[11px] uppercase tracking-[0.12em]" fill="#94a3b8">
            Movement · Exploration · Recovery online
          </text>
        </g>

        {clusters.map((cluster, clusterIndex) => {
          const radius = radii[clusterIndex] ?? 140;
          const arcLength = 2 * Math.PI * radius;
          const dash = Math.max(arcLength * (cluster.value * 0.9 + 0.05), 40);
          const dashArray = `${dash} ${arcLength}`;

          return (
            <g
              key={cluster.id}
              role="button"
              tabIndex={0}
              aria-label={`${cluster.label} sensor: ${cluster.detail}`}
              className="transition duration-300 focus:outline-none"
              onMouseEnter={() => setActive(cluster.id)}
              onFocus={() => setActive(cluster.id)}
              onMouseLeave={() => setActive(null)}
              onBlur={() => setActive(null)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActive((current) => (current === cluster.id ? null : cluster.id));
                }
              }}
            >
              <circle cx={positions[clusterIndex]?.x ?? 0} cy={positions[clusterIndex]?.y ?? 0} r={radius} className="fill-none stroke-border/50" strokeWidth={2} strokeDasharray="6 10" />
              <motion.circle
                cx={positions[clusterIndex]?.x ?? 0}
                cy={positions[clusterIndex]?.y ?? 0}
                r={radius}
                className="fill-none"
                stroke={cluster.color}
                strokeWidth={active === cluster.id ? 16 : 12}
                strokeOpacity={0.6}
                strokeDasharray={dashArray}
                strokeLinecap="round"
                style={{ transformOrigin: `${positions[clusterIndex]?.x ?? 0}px ${positions[clusterIndex]?.y ?? 0}px` }}
                initial={{ rotate: 0, opacity: 0.6 }}
                animate={{ rotate: active === cluster.id ? 6 : 0, opacity: active === cluster.id ? 1 : 0.7 }}
                transition={{ type: "spring", stiffness: 90, damping: 16 }}
              />
              {clusterPoints[clusterIndex]?.map((point, index) => (
                <motion.circle
                  key={`${cluster.id}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={point.size + 1}
                  className="mix-blend-screen"
                  style={{ filter: "drop-shadow(0 0 12px rgba(255,255,255,0.35))" }}
                  fill={cluster.color}
                  initial={{ opacity: 0.08, scale: 0.9 }}
                  animate={{
                    opacity: [0.12, 0.42, 0.2],
                    scale: [0.9, 1.08, 0.96],
                    x: [0, (index % 3) - 1.5, (index % 2) - 0.8],
                    y: [0, ((index + 1) % 3) - 1.5, ((index + 2) % 2) - 0.6],
                  }}
                  transition={{ duration: 4.5 + (index % 6) * 0.2, repeat: Infinity, ease: "easeInOut", delay: index * 0.018 }}
                  opacity={active === cluster.id ? 0.9 : 0.45}
                />
              ))}
              <motion.text
                x={(positions[clusterIndex]?.x ?? 0) + 12}
                y={(positions[clusterIndex]?.y ?? 0) - (radius - 26)}
                className="text-sm font-semibold"
                fill="#e2e8f0"
                initial={{ opacity: 0 }}
                animate={{ opacity: active === cluster.id ? 1 : 0.7 }}
              >
                {cluster.label}
              </motion.text>
            </g>
          );
        })}

        <g transform="translate(780 130)">
          <rect x={0} y={0} width={360} height={260} rx={24} className="fill-slate-900/85 stroke-border/60" />
          <motion.rect
            x={10}
            y={12}
            width={340}
            height={236}
            rx={18}
            className="fill-none"
            stroke="rgba(34,211,238,0.16)"
            animate={{ opacity: active ? 1 : 0.6 }}
          />
          <text x={24} y={42} className="text-xs uppercase tracking-[0.14em]" fill="#94a3b8">
            System chip · stable
          </text>
          <text x={24} y={72} className="text-[22px] font-semibold tracking-tight" fill="#e2e8f0">
            Personal OS v1.x
          </text>
          <text x={24} y={96} className="text-[12px] uppercase tracking-[0.14em]" fill="#cbd5e1">
            {activeCluster.label}
          </text>
          <text x={24} y={118} className="text-sm" fill="#e2e8f0">
            {activeCluster.description}
          </text>
          <text x={24} y={142} className="text-sm" fill="#cbd5e1">
            {activeCluster.detail}
          </text>
          <g transform="translate(0 164)" className="text-[11px] uppercase tracking-[0.12em] text-white/70">
            <text x={24} y={18}>Movement: ~420 / ~600 mi</text>
            <text x={24} y={42}>Exploration: airport-opinionated (~82%)</text>
            <text x={24} y={66}>Recovery: ~0.75 fullness (~76%)</text>
          </g>
          <motion.circle
            cx={320}
            cy={56}
            r={12}
            fill="#22d3ee"
            fillOpacity={0.18}
            animate={{ scale: [1, 1.1, 1], opacity: [0.9, 0.6, 0.9] }}
            transition={{ repeat: Infinity, duration: 3 }}
          />
          <motion.circle
            cx={320}
            cy={56}
            r={6}
            fill="#22d3ee"
            animate={{ scale: [1, 1.3, 1], opacity: [0.9, 0.4, 0.9] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        </g>
      </svg>
    </div>
  );
}
