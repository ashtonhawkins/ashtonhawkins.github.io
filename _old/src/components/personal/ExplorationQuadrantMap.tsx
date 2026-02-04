import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";

export interface Quadrant {
  id: string;
  label: string;
  descriptor: string;
  intensity: number;
  percentage: number;
}

type Props = {
  quadrants: Quadrant[];
};

const nodePositions: Record<string, { x: number; y: number }> = {
  "rainy-coastal": { x: 22, y: 46 },
  "sunny-waterfront": { x: 78, y: 40 },
  "historic-core": { x: 36, y: 78 },
  "transit-rich": { x: 68, y: 24 },
};

export default function ExplorationQuadrantMap({ quadrants }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const nodes = useMemo(
    () =>
      quadrants.map((zone) => ({
        ...zone,
        ...nodePositions[zone.id],
      })),
    [quadrants],
  );

  const activeNode = nodes.find((node) => node.id === active) ?? nodes[0];

  return (
    <section className="grid gap-4 rounded-3xl border border-border/70 bg-surface/90 p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">Exploration profile</h2>
          <p className="text-text-secondary">The kinds of places I keep returning to.</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Map view</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
        <div className="flex justify-center lg:justify-start">
          <svg
            viewBox="0 0 540 360"
            role="img"
            aria-labelledby="exploration-title"
            aria-describedby="exploration-desc"
            className="h-[320px] w-full max-w-[540px]"
          >
            <title id="exploration-title">Exploration quadrants map.</title>
            <desc id="exploration-desc">
              A 2 by 2 chart with rainy to sunny on the horizontal axis and historic cores to transit-rich metros on the vertical
              axis. Nodes highlight the types of environments I gravitate toward most.
            </desc>
            <defs>
              <linearGradient id="quad-grid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(148,163,184,0.5)" />
                <stop offset="100%" stopColor="rgba(148,163,184,0.2)" />
              </linearGradient>
            </defs>

            <rect x={40} y={30} width={460} height={280} rx={20} className="fill-surface/70 stroke-border/60" />
            <line x1={270} x2={270} y1={30} y2={310} stroke="url(#quad-grid)" strokeWidth={1} strokeDasharray="8 10" />
            <line x1={40} x2={500} y1={170} y2={170} stroke="url(#quad-grid)" strokeWidth={1} strokeDasharray="8 10" />

            <text x={46} y={320} className="text-[11px] uppercase tracking-[0.12em]" fill="#94a3b8">
              Rainy
            </text>
            <text x={470} y={320} textAnchor="end" className="text-[11px] uppercase tracking-[0.12em]" fill="#94a3b8">
              Sunny
            </text>
            <text x={24} y={200} textAnchor="middle" transform="rotate(-90 24 200)" className="text-[11px] uppercase tracking-[0.12em]" fill="#94a3b8">
              Historic cores
            </text>
            <text x={520} y={188} textAnchor="middle" transform="rotate(90 520 188)" className="text-[11px] uppercase tracking-[0.12em]" fill="#94a3b8">
              Transit-rich metros
            </text>

            {nodes.map((node, index) => {
              const baseX = 40 + (node.x / 100) * 460;
              const baseY = 30 + (node.y / 100) * 280;
              const radius = 12 + node.intensity * 16;
              return (
                <g
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active === node.id}
                  aria-label={`${node.label} — approx. ${node.percentage}% intensity`}
                  onMouseEnter={() => setActive(node.id)}
                  onFocus={() => setActive(node.id)}
                  onBlur={() => setActive(null)}
                  onMouseLeave={() => setActive(null)}
                >
                  <motion.circle
                    cx={baseX}
                    cy={baseY}
                    r={radius}
                    fill="rgba(192,132,252,0.18)"
                    stroke="rgba(56,189,248,0.4)"
                    animate={{ opacity: active === node.id ? 0.9 : 0.6, scale: active === node.id ? 1.08 : 1 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  />
                  <motion.circle
                    cx={baseX}
                    cy={baseY}
                    r={8 + node.intensity * 10}
                    fill="url(#quad-grid)"
                    animate={
                      prefersReducedMotion
                        ? { opacity: active === node.id ? 0.9 : 0.65 }
                        : { opacity: [0.65, 0.9, 0.7], scale: [1, 1.06, 1] }
                    }
                    transition={{ duration: prefersReducedMotion ? 0.2 : 3.6, repeat: prefersReducedMotion ? 0 : Infinity }}
                  />
                  <text x={baseX} y={baseY - radius - 8} textAnchor="middle" className="text-[11px] uppercase tracking-[0.12em]" fill="#e2e8f0">
                    {node.descriptor}
                  </text>
                  <text x={baseX} y={baseY + radius + 14} textAnchor="middle" className="text-xs font-semibold" fill="#e2e8f0">
                    {node.percentage}%
                  </text>
                  <motion.circle
                    cx={baseX}
                    cy={baseY}
                    r={radius + 20}
                    fill="none"
                    stroke="rgba(125,211,252,0.15)"
                    strokeDasharray="6 10"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: active === node.id ? 1.05 : 1, opacity: active === node.id ? 1 : 0.2 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.06 }}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        <div className="space-y-3 rounded-3xl border border-border/70 bg-surface/80 p-5" aria-live="polite">
          <p className="text-xs uppercase tracking-[0.12em] text-text-tertiary">Active environment</p>
          <p className="text-xl font-semibold text-text-primary">{activeNode?.descriptor ?? "Sunny waterfront"}</p>
          <p className="text-sm leading-relaxed text-text-secondary">
            {activeNode?.label} — approx. {activeNode?.percentage}% intensity. Think: {activeNode?.descriptor} spots where I can
            walk, swim, train, and recharge.
          </p>
        </div>
      </div>
    </section>
  );
}
