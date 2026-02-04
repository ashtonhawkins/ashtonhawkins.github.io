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
    const center = { x: 200, y: 200 };
    return worlds.map((world, index) => {
      const angle = (index / worlds.length) * Math.PI * 2 - Math.PI / 2;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle) * 0.8;
      return { ...world, x, y };
    });
  }, [worlds]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
      <div className="relative flex min-h-[380px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-border/70 bg-surface/90 p-6 shadow-soft">
        <div className="pointer-events-none absolute inset-6 rounded-[28px] border border-dashed border-border/60" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(125,211,252,0.08)_0,_transparent_50%)]" aria-hidden />
        <div className="relative z-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-text-primary">Personal OS</p>
          <p className="text-xs uppercase tracking-[0.12em] text-text-tertiary">Worlds online</p>
        </div>

        {nodes.map((node) => (
          <motion.div
            key={node.id}
            className="world-card absolute hidden w-[220px] max-w-[60vw] rounded-2xl border border-border/70 bg-surface/95 p-4 text-left shadow-soft lg:block"
            style={{ left: node.x, top: node.y, transform: "translate(-50%, -50%)" }}
            data-active={active === node.id}
            onMouseEnter={() => setActive(node.id)}
            onFocus={() => setActive(node.id)}
            tabIndex={0}
            role="article"
          >
            <p className="text-xs uppercase tracking-[0.12em] text-text-tertiary">{node.title}</p>
            <p className="text-sm text-text-secondary">{node.description}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.08em] text-primary">
              {node.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-3 rounded-3xl border border-border/70 bg-surface/80 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-text-tertiary">Worlds I move in</p>
            <h3 className="text-xl font-semibold text-text-primary">Sensors around the arenas that keep the system interesting.</h3>
          </div>
          <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-semibold text-text-secondary ring-1 ring-border/70">Worlds online</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {worlds.map((world) => (
            <article
              key={world.id}
              className="group flex flex-col gap-2 rounded-2xl border border-border/70 bg-surface/90 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-primary/60 focus-within:-translate-y-0.5 focus-within:border-primary/60"
              tabIndex={0}
              onMouseEnter={() => setActive(world.id)}
              onFocus={() => setActive(world.id)}
              aria-label={`${world.title} — ${world.description}`}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-text-primary">{world.title}</h4>
                <span className="text-[11px] uppercase tracking-[0.1em] text-text-tertiary">{world.id.replace("-", " ")}</span>
              </div>
              <p className="text-sm leading-relaxed text-text-secondary">{world.description}</p>
              <div className="mt-auto flex flex-wrap gap-2 text-xs uppercase tracking-[0.08em] text-primary">
                {world.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-primary/10 px-2 py-1 text-primary ring-1 ring-primary/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
