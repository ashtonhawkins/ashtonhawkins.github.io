import { motion, useReducedMotion } from "motion/react";

type SoundBadgeProps = {
  track?: { artist: string; title: string };
};

const bars = [0, 1, 2, 3];

const SoundBadge = ({ track }: SoundBadgeProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-surface/70 p-5 shadow-soft">
      <div className="flex items-end gap-1" aria-hidden="true">
        {bars.map((bar) => (
          <motion.span
            key={bar}
            initial={reduceMotion ? undefined : { scaleY: 0.4 }}
            animate={
              reduceMotion
                ? { scaleY: 0.6 }
                : {
                    scaleY: [0.4, 1, 0.3, 0.8],
                    transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: bar * 0.12 }
                  }
            }
            className="w-1 origin-bottom rounded-full bg-accent"
            style={{ height: "20px" }}
          />
        ))}
      </div>
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-text-primary">Now playing</p>
        <p className="text-text-secondary">{track ? `${track.title} — ${track.artist}` : "Queue is quiet."}</p>
      </div>
    </div>
  );
};

export default SoundBadge;
