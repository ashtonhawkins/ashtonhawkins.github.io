import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

type PrincipleItem = { front: string; back: string };

type PrincipleCardsProps = { items: PrincipleItem[]; seed: number };

const shuffleWith = <T,>(list: T[], random: () => number) => {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const createSeededRandom = (seed: number) => {
  let value = seed % 1;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
};

const shuffleItems = <T,>(list: T[]) => shuffleWith(list, Math.random);

const shuffleWithSeed = <T,>(list: T[], seed: number) => shuffleWith(list, createSeededRandom(seed));

const PrincipleCards = ({ items, seed }: PrincipleCardsProps) => {
  const [ordered, setOrdered] = useState(() => shuffleWithSeed(items, seed));
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setOrdered(shuffleWithSeed(items, seed));
    setFlipped({});
  }, [items, seed]);

  const gridItems = useMemo(() => ordered.slice(0, 6), [ordered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-text-primary">Practices & Principles</h2>
        <button
          type="button"
          onClick={() => {
            setOrdered((current) => shuffleItems(current));
            setFlipped({});
          }}
          className="rounded-full border border-border/60 bg-surface px-4 py-2 text-sm font-medium text-text-primary transition hover:border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Shuffle one
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {gridItems.map((item) => {
          const isFlipped = flipped[item.front];
          return (
            <button
              key={item.front}
              type="button"
              onClick={() =>
                setFlipped((current) => ({ ...current, [item.front]: !current[item.front] }))
              }
              className="relative h-40 overflow-hidden rounded-3xl border border-border/60 bg-surface/80 text-left shadow-soft transition hover:border-accent/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <motion.div
                initial={reduceMotion ? undefined : { rotateY: 0 }}
                animate={reduceMotion ? undefined : { rotateY: isFlipped ? 180 : 0 }}
                transition={reduceMotion ? undefined : { duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
                className="h-full w-full"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div
                  className="absolute inset-0 flex items-center justify-center px-6 text-center text-base font-semibold text-text-primary"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(0deg)" }}
                >
                  {item.front}
                </div>
                <div
                  className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-medium text-text-secondary"
                  style={{ backfaceVisibility: "hidden", transform: reduceMotion ? "none" : "rotateY(180deg)" }}
                >
                  {item.back}
                </div>
              </motion.div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PrincipleCards;
