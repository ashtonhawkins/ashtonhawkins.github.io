import { motion } from "framer-motion";
import { useMemo, useState } from "react";

type World = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  intensity: number;
};

type Props = {
  worlds: World[];
};

export default function WorldsOrbit({ worlds }: Props) {
  const [active, setActive] = useState<string | null>(null);

  const nodes = useMemo(() => {
    const radius = 138;
    const center = { x: 200, y: 200 };
    return worlds.map((world, index) => {
      const angle = (index / worlds.length) * Math.PI * 2 - Math.PI / 2;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);
      return { ...world, x, y };
    });
  }, [worlds]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
      <div className="flex justify-center lg:justify-start">
        <svg viewBox="0 0 400 400" className="h-[380px] w-[380px] max-w-full" role="img" aria-label="Orbit map of Ashton Hawkins' focus areas">
          <defs>
            <radialGradient id="orbit-glow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
            </radialGradient>
          </defs>
          <circle cx={200} cy={200} r={110} className="fill-surface/80 stroke-border/70" />
          <circle cx={200} cy={200} r={170} className="fill-none stroke-border/40" strokeDasharray="6 8" />
          <circle cx={200} cy={200} r={200} className="fill-none stroke-border/30" strokeDasharray="4 14" />
          <motion.circle
            cx={200}
            cy={200}
            r={80}
            fill="url(#orbit-glow)"
            animate={{ opacity: active ? 0.5 : 0.32, scale: active ? 1.05 : 1 }}
            transition={{ duration: 0.6 }}
          />
          <text x={200} y={190} textAnchor="middle" className="text-sm font-semibold tracking-[0.18em] uppercase" fill="#e2e8f0">
            Personal OS
          </text>
          <text x={200} y={210} textAnchor="middle" className="text-[11px] uppercase tracking-[0.14em]" fill="#cbd5e1">
            Worlds online
          </text>

          {nodes.map((node) => (
            <g key={node.id}>
              <line
                x1={200}
                y1={200}
                x2={node.x}
                y2={node.y}
                stroke="rgba(148,163,184,0.35)"
                strokeWidth={1}
                strokeDasharray="3 6"
              />
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={14 + node.intensity * 12}
                fill="#0f172a"
                stroke="#7dd3fc"
                strokeOpacity={0.4}
                animate={{ scale: active === node.id ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 120, damping: 12 }}
                className="cursor-pointer focus:outline-none"
                tabIndex={0}
                role="button"
                aria-label={`${node.title} focus area at intensity ${Math.round(node.intensity * 10)}/10`}
                onMouseEnter={() => setActive(node.id)}
                onFocus={() => setActive(node.id)}
                onMouseLeave={() => setActive(null)}
                onBlur={() => setActive(null)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActive(node.id);
                  }
                }}
              />
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={10 + node.intensity * 10}
                fill="#22d3ee"
                fillOpacity={0.22}
                animate={{ opacity: active === node.id ? 0.9 : 0.5 }}
              />
              <text x={node.x} y={node.y - (20 + node.intensity * 12)} textAnchor="middle" className="text-[11px] uppercase tracking-[0.1em]" fill="#cbd5e1">
                {node.title}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="divide-y divide-border/70 overflow-hidden rounded-3xl border border-border/70 bg-surface/80">
        {worlds.map((world) => (
          <article
            key={world.id}
            className="group relative flex flex-col gap-2 px-5 py-5 transition duration-300 focus-within:bg-primary/5 data-[highlight='true']:bg-primary/5"
            data-highlight={active === world.id}
            onMouseEnter={() => setActive(world.id)}
            onFocus={() => setActive(world.id)}
            onMouseLeave={() => setActive(null)}
            tabIndex={0}
          >
            <span className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary/70 via-secondary/60 to-amber-200/70 opacity-0 transition duration-300 group-hover:opacity-100" aria-hidden />
            <header className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary sm:text-xl">{world.title}</h3>
              <span className="text-[11px] uppercase tracking-[0.1em] text-text-tertiary">{world.id.replace("-", " ")}</span>
            </header>
            <p className="text-sm leading-relaxed text-text-secondary sm:text-base">{world.description}</p>
            <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary">{world.tags.join(" · ")}</p>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span className="rounded-full bg-border/60 px-2 py-1 font-semibold text-text-primary">{Math.round(world.intensity * 10) / 10} intensity</span>
              <span className="h-1 flex-1 rounded-full bg-border/70">
                <motion.span
                  className="block h-full rounded-full bg-gradient-to-r from-primary/70 to-secondary/70"
                  initial={{ width: 0 }}
                  animate={{ width: `${world.intensity * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
