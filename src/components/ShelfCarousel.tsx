import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

type ShelfItem = { title: string; note?: string };

type ShelfCarouselProps = { items: ShelfItem[] };

const emitAnalytics = (label: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("ah:analytics", { detail: { name: "card_expand", label } }));
};

const ShelfCarousel = ({ items }: ShelfCarouselProps) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" aria-hidden="true" />
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pr-6">
        {items.map((item, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <motion.button
              key={item.title}
              type="button"
              aria-expanded={isExpanded}
              onClick={() => {
                setExpandedIndex((current) => {
                  if (current === index) return null;
                  emitAnalytics(`shelf_${item.title.toLowerCase().replace(/\s+/g, "_")}`);
                  return index;
                });
              }}
              initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={reduceMotion ? undefined : { duration: 0.4, ease: [0.33, 1, 0.68, 1], delay: index * 0.05 }}
              className={`relative flex min-h-[200px] min-w-[240px] snap-start flex-col rounded-2xl border border-border/50 bg-surface/80 p-5 text-left shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                isExpanded ? "ring-2 ring-accent/60" : "hover:border-accent/40"
              }`}
            >
              <span className="text-lg font-semibold text-text-primary">{item.title}</span>
              {isExpanded && item.note ? (
                <motion.p
                  initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={reduceMotion ? undefined : { duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
                  className="mt-4 text-sm text-text-secondary"
                >
                  {item.note}
                </motion.p>
              ) : null}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default ShelfCarousel;
