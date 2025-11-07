import { motion, useReducedMotion } from "motion/react";

type PhotostripTile = { label: string; description: string; colors: [string, string, string] };

type PhotostripProps = { tiles: PhotostripTile[] };

const buildGradient = (colors: [string, string, string]) =>
  `radial-gradient(circle at 20% 20%, ${colors[0]} 0%, transparent 60%), conic-gradient(from 180deg at 80% 80%, ${colors[1]} 0%, ${colors[2]} 60%, ${colors[1]} 100%)`;

const Photostrip = ({ tiles }: PhotostripProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex justify-center">
      <div className="relative flex items-center">
        {tiles.map((tile, index) => (
          <motion.figure
            key={tile.label}
            className={`relative aspect-square w-40 overflow-hidden rounded-3xl border border-border/70 bg-surface shadow-soft ${
              index === 1 ? "z-20" : index === 0 ? "z-10" : "z-0"
            }`}
            style={{
              marginLeft: index === 0 ? 0 : -40,
              transformOrigin: "center",
              backgroundImage: buildGradient(tile.colors)
            }}
            initial={reduceMotion ? undefined : { rotate: index === 1 ? -1 : index === 0 ? -6 : 6 }}
            whileHover={
              reduceMotion
                ? undefined
                : { rotate: index === 1 ? 0 : index === 0 ? -3 : 3, translateY: -6 }
            }
            transition={reduceMotion ? undefined : { duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
          >
            <figcaption className="absolute inset-x-4 bottom-4 rounded-full bg-background/80 px-3 py-1 text-center text-xs font-medium text-text-primary backdrop-blur">
              <span className="block text-[0.65rem] uppercase tracking-[0.18em] text-text-secondary">{tile.label}</span>
              <span className="text-[0.7rem] text-text-primary">{tile.description}</span>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </div>
  );
};

export default Photostrip;
