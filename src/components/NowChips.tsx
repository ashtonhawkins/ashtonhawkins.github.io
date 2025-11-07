import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

type NowChip = { label: string; href: string };

type NowChipsProps = { items: NowChip[] };

const emitAnalytics = (label: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("ah:analytics", { detail: { name: "feed_item_click", label } }));
};

const NowChips = ({ items }: NowChipsProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-10%" });

  return (
    <div ref={ref} className="flex flex-wrap gap-3">
      {items.map((item, index) => (
        <motion.a
          key={item.label}
          href={item.href}
          onClick={() => emitAnalytics(`now_${item.label.toLowerCase().replace(/\s+/g, "_")}`)}
          initial={reduceMotion ? undefined : { opacity: 0, y: 12, backgroundPosition: "0% 50%" }}
          animate={
            reduceMotion
              ? undefined
              : inView
              ? { opacity: 1, y: 0, backgroundPosition: "120% 50%" }
              : { opacity: 0, y: 12 }
          }
          transition={reduceMotion ? undefined : { duration: 0.6, ease: [0.33, 1, 0.68, 1], delay: index * 0.06 }}
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface/70 px-4 py-2 text-sm font-medium text-text-primary shadow-sm backdrop-blur transition hover:border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          style={
            reduceMotion
              ? undefined
              : {
                  backgroundImage:
                    "linear-gradient(120deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.35) 40%, rgba(255,255,255,0.05) 80%)",
                  backgroundSize: "200% 200%"
                }
          }
        >
          <span className="text-text-secondary">Now</span>
          <span>{item.label}</span>
        </motion.a>
      ))}
    </div>
  );
};

export default NowChips;
