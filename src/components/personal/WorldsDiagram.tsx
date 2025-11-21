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

const positions = [
  { x: 0, y: -120 },
  { x: 140, y: -16 },
  { x: -140, y: -16 },
  { x: 0, y: 128 },
];

export default function WorldsDiagram({ worlds }: Props) {
  const [active, setActive] = useState(worlds[0]?.id ?? "");

  const mapped = useMemo(
    () => worlds.map((world, index) => ({ ...world, position: positions[index] ?? { x: 0, y: 0 } })),
    [worlds],
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-soft">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="relative flex h-[380px] items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(226,232,240,0.08),transparent_60%)]" aria-hidden />
          <div className="absolute inset-8 rounded-[28px] border border-white/5 bg-[linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:70px_70px]" />
          <motion.div
            className="relative flex h-28 w-28 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl"
            initial={{ scale: 0.96, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">Personal OS</p>
              <p className="text-sm font-semibold text-white">Worlds online</p>
            </div>
          </motion.div>
          {mapped.map((world) => {
            const isActive = world.id === active;
            const size = 90 + world.intensity * 22;
            return (
              <motion.button
                key={world.id}
                type="button"
                className="absolute flex flex-col items-center justify-center rounded-full border border-white/10 bg-slate-900/80 text-center shadow-soft focus:outline-none"
                style={{ width: size, height: size, transform: `translate(${world.position.x}px, ${world.position.y}px)` }}
                onMouseEnter={() => setActive(world.id)}
                onFocus={() => setActive(world.id)}
                onMouseLeave={() => setActive(mapped[0]?.id ?? world.id)}
                onBlur={() => setActive(mapped[0]?.id ?? world.id)}
                animate={{ opacity: isActive ? 1 : 0.72, scale: isActive ? 1.06 : 0.98 }}
                transition={{ type: "spring", stiffness: 120, damping: 12 }}
              >
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ boxShadow: `0 0 32px ${isActive ? "rgba(59,130,246,0.45)" : "rgba(148,163,184,0.18)"}` }}
                  animate={{ opacity: isActive ? 0.7 : 0.4 }}
                />
                <span className="relative text-xs uppercase tracking-[0.14em] text-text-tertiary">{world.title}</span>
                <span className="relative text-lg font-semibold text-white">{(world.intensity * 10).toFixed(1)}</span>
                <span className="relative text-[11px] text-text-secondary">Intensity</span>
              </motion.button>
            );
          })}
        </div>

        <div className="grid gap-4">
          <p className="text-sm leading-relaxed text-text-secondary">
            Four arenas feed the system. They orbit the core but stay connected—travel informs product sense, cycling supports recovery, and recovery keeps curiosity sharp.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {mapped.map((world) => {
              const isActive = world.id === active;
              return (
                <motion.div
                  key={world.id}
                  className="group rounded-2xl border border-white/10 bg-white/5 p-4 shadow-soft"
                  animate={{ borderColor: isActive ? "rgba(34,211,238,0.5)" : "rgba(255,255,255,0.08)", scale: isActive ? 1.02 : 1 }}
                  onMouseEnter={() => setActive(world.id)}
                  onFocus={() => setActive(world.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{world.title}</p>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-text-secondary">{(world.intensity * 10).toFixed(1)}</span>
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">{world.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-text-tertiary">
                    {world.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-white/10 px-2 py-1">
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
