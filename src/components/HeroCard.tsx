import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

type HeroCardProps = {
  headline: string;
  subhead: string;
  places: string[];
};

const emitAnalytics = (name: string, detail: Record<string, string>) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("ah:analytics", { detail: { name, ...detail } }));
};

const HeroCard = ({ headline, subhead, places }: HeroCardProps) => {
  const reduceMotion = useReducedMotion();
  const [chips, setChips] = useState(() => places.slice(0, 3));

  useEffect(() => {
    setChips(() => {
      const next = [...places];
      for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next.slice(0, 3);
    });
  }, [places]);

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={reduceMotion ? undefined : { duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
      className="relative isolate overflow-hidden rounded-[32px] border border-border/60 bg-surface/80 p-8 shadow-soft backdrop-blur"
    >
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_200px] md:items-center">
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-text-secondary">About</p>
            <h1 className="text-3xl font-semibold text-text-primary md:text-4xl">{headline}</h1>
            <p className="max-w-prose text-lg text-text-secondary">{subhead}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:hello@ashtonhawkins.com"
              onClick={() => emitAnalytics("cta_click", { label: "hero_primary" })}
              className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-2 text-sm font-semibold text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong hover:bg-accent-strong"
            >
              Say hello
            </a>
            <a
              href="/resume.pdf"
              onClick={() => emitAnalytics("cta_click", { label: "hero_secondary" })}
              className="inline-flex items-center justify-center rounded-full border border-border/60 bg-surface px-6 py-2 text-sm font-semibold text-text-primary transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent hover:border-border hover:bg-surface/90"
            >
              Résumé
            </a>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-text-secondary">
            {chips.map((place) => (
              <span
                key={place}
                className="rounded-full border border-border/50 bg-surface/70 px-4 py-1 font-medium text-text-primary shadow-sm"
              >
                {place}
              </span>
            ))}
          </div>
        </div>
        <div
          aria-hidden="true"
          className="mx-auto flex h-48 w-48 items-center justify-center rounded-full text-3xl font-semibold text-text-inverted shadow-overlay"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.25) 0%, transparent 60%), conic-gradient(from 140deg at 50% 50%, rgba(80, 125, 255, 0.85) 0deg, rgba(98, 190, 255, 0.9) 140deg, rgba(80, 125, 255, 0.85) 320deg)",
            backdropFilter: "blur(18px)"
          }}
        >
          AH
        </div>
      </div>
    </motion.div>
  );
};

export default HeroCard;
