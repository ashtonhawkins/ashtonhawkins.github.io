import { motion } from "framer-motion";
import { useState } from "react";

type Quadrant = {
  id: string;
  label: string;
  descriptor: string;
  percentage: number;
  intensity: number;
};

type Props = {
  quadrants: Quadrant[];
};

const gradients = [
  "from-cyan-500/20 via-sky-400/20 to-blue-500/10",
  "from-amber-300/20 via-orange-400/20 to-pink-400/10",
  "from-emerald-400/20 via-teal-300/20 to-slate-400/10",
  "from-violet-400/20 via-indigo-400/20 to-blue-500/10",
];

export default function ExplorationQuadrants({ quadrants }: Props) {
  const [active, setActive] = useState(quadrants[0]?.id ?? "");

  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-soft">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="grid grid-cols-2 gap-4">
          {quadrants.map((quadrant, index) => {
            const isActive = active === quadrant.id;
            return (
              <motion.div
                key={quadrant.id}
                className={`relative overflow-hidden rounded-2xl border p-5 ${isActive ? "border-cyan-400/60" : "border-white/10"}`}
                onMouseEnter={() => setActive(quadrant.id)}
                onFocus={() => setActive(quadrant.id)}
                animate={{ scale: isActive ? 1.02 : 1 }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${gradients[index] ?? gradients[0]} opacity-70`} />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:60px_60px] opacity-50" />
                <div className="relative space-y-1 text-white">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/70">{quadrant.descriptor}</p>
                  <p className="text-2xl font-semibold">{quadrant.label}</p>
                  <p className="text-sm text-white/90">Intensity ~{Math.round(quadrant.intensity * 10)}/10</p>
                </div>
                <div className="relative mt-6 flex items-end justify-between">
                  <p className="text-4xl font-bold text-white/90">{quadrant.percentage}%</p>
                  <div className="text-right text-xs uppercase tracking-[0.14em] text-white/80">
                    <p>{quadrant.descriptor.split(" ")[0]?.toUpperCase()}</p>
                    <p className="text-white/60">Profile</p>
                  </div>
                </div>
                <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-white/20">
                  <motion.div
                    className="h-full bg-white"
                    style={{ width: `${quadrant.percentage}%` }}
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: isActive ? 1 : 0.9 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">Exploration profile</p>
          <p className="text-xl font-semibold text-white">The quadrants I seek out</p>
          <p className="text-sm leading-relaxed text-text-secondary">
            Rainy coasts, sunny waterfronts, historic cores, transit-rich metros. The map is intentionally fuzzy—good enough to steer curiosity without overfitting.
          </p>
          <p className="text-xs text-text-tertiary">Approximate ranges only; preferences adjust as the season and schedule shift.</p>
        </div>
      </div>
    </div>
  );
}
