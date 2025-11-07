import { useEffect, useMemo, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

type ProofStat = { label: string; value: number };

type ProofTickerProps = { stats: ProofStat[] };

const ProofTicker = ({ stats }: ProofTickerProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const [values, setValues] = useState(() => stats.map(() => 0));

  const formatted = useMemo(
    () => values.map((value) => Math.round(value)),
    [values]
  );

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      setValues(stats.map((stat) => stat.value));
      return;
    }
    let frame: number;
    const start = performance.now();
    const duration = 900;

    const step = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValues(stats.map((stat) => stat.value * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduceMotion, stats]);

  return (
    <div ref={ref} className="flex flex-wrap gap-6 rounded-3xl border border-border/60 bg-surface/60 p-6 shadow-soft">
      {stats.map((stat, index) => (
        <div key={stat.label} className="flex min-w-[140px] flex-col">
          <span className="text-3xl font-semibold text-text-primary">{formatted[index]}</span>
          <span className="text-sm text-text-secondary">{stat.label}</span>
        </div>
      ))}
    </div>
  );
};

export default ProofTicker;
