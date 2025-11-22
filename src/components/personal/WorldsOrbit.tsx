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
    const radius = 140;
    const center = { x: 180, y: 180 };
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
        <svg viewBox="0 0 360 360" className="h-[360px] w-[360px] max-w-full" role="img" aria-label="Orbit map of Ashton Hawkins' focus areas">
          <defs>
            <radialGradient id="orbit-glow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
            </radialGradient>
          </defs>
          <circle cx={180} cy={180} r={88} className="fill-surface/80 stroke-border/70" />
          <circle cx={180} cy={180} r={130} className="fill-none stroke-border/50" strokeDasharray="6 8" />
          <circle cx={180} cy={180} r={170} className="fill-none stroke-border/30" strokeDasharray="4 12" />
          <motion.circle
            cx={180}
            cy={180}
            r={64}
            fill="url(#orbit-glow)"
            animate={{ opacity: active ? 0.5 : 0.3, scale: active ? 1.05 : 1 }}
            transition={{ duration: 0.6 }}
          />
          <text x={180} y={176} textAnchor="middle" className="text-sm font-semibold tracking-[0.18em] uppercase" fill="#e2e8f0">
            Personal OS
          </text>
          <text x={180} y={196} textAnchor="middle" className="text-[11px] uppercase tracking-[0.14em]" fill="#cbd5e1">
            Worlds online
          </text>

          {nodes.map((node) => (
            <g key={node.id}>
              <line
                x1={180}
                y1={180}
                x2={node.x}
                y2={node.y}
                stroke="rgba(148,163,184,0.35)"
                strokeWidth={1}
                strokeDasharray="3 6"
              />
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={14 + node.intensity * 8}
                fill="#0f172a"
                stroke="#7dd3fc"
                strokeOpacity={0.4}
                animate={{ scale: active === node.id ? 1.08 : 1 }}
                transition={{ type: "spring", stiffness: 120, damping: 12 }}
                className="cursor-pointer focus:outline-none"
                tabIndex={0}
                role="button"
                aria-label={`${node.title} focus area at intensity ${Math.round(node.intensity * 10)}/10`}
                onMouseEnter={() => setActive(node.id)}
                onFocus={() => setActive(node.id)}
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
                r={8 + node.intensity * 6}
                fill="#22d3ee"
                fillOpacity={0.2}
                animate={{ opacity: active === node.id ? 0.8 : 0.4 }}
              />
              <text x={node.x} y={node.y - (18 + node.intensity * 10)} textAnchor="middle" className="text-[11px] uppercase tracking-[0.1em]" fill="#cbd5e1">
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
            className="flex flex-col gap-2 px-5 py-5 transition duration-300 focus-within:bg-primary/5 data-[highlight='true']:bg-primary/5"
            data-highlight={active === world.id}
            onMouseEnter={() => setActive(world.id)}
            onFocus={() => setActive(world.id)}
            tabIndex={0}
          >
            <header className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary sm:text-xl">{world.title}</h3>
              <span className="text-[11px] uppercase tracking-[0.1em] text-text-tertiary">{world.id.replace("-", " ")}</span>
            </header>
            <p className="text-sm leading-relaxed text-text-secondary sm:text-base">{world.description}</p>
            <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary">{world.tags.join(" · ")}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
