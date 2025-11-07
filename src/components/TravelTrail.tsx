import { useMemo } from "react";

import type { TravelItem } from "../lib/data";

type TravelTrailProps = { stops: TravelItem[] };

const TravelTrail = ({ stops }: TravelTrailProps) => {
  const path = useMemo(() => {
    if (!stops.length) return "";
    const values = stops.map((stop) => new Date(stop.date).getTime());
    const min = Math.min(...values);
    const max = Math.max(...values);
    return values
      .map((value, index) => {
        const x = stops.length === 1 ? 0 : (index / (stops.length - 1)) * 100;
        const ratio = max === min ? 0.5 : (value - min) / (max - min);
        const y = 28 - ratio * 18;
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [stops]);

  return (
    <div className="space-y-4 rounded-3xl border border-border/60 bg-surface/70 p-6 shadow-soft">
      <div className="flex items-center gap-3">
        {stops.map((stop, index) => {
          const dateLabel = new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric"
          }).format(new Date(stop.date));
          return (
            <div key={stop.city} className="flex items-center gap-3">
              <button
                type="button"
                aria-label={`${stop.city}${stop.region ? `, ${stop.region}` : ""} on ${dateLabel}`}
                className="group relative rounded-full border border-border/60 bg-background px-4 py-2 text-sm font-medium text-text-primary shadow-sm transition hover:border-accent/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span>{stop.city}</span>
                {stop.region ? <span className="ml-2 text-text-secondary">{stop.region}</span> : null}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-overlay px-3 py-1 text-xs font-medium text-text-inverted opacity-0 transition group-focus-visible:opacity-100 group-hover:opacity-100"
                >
                  {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(stop.date))}
                </span>
              </button>
              {index < stops.length - 1 ? (
                <span className="h-px w-8 border-t border-dashed border-border/70" aria-hidden="true" />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="h-8 w-full">
        <svg viewBox="0 0 100 32" className="h-full w-full text-accent" role="img" aria-label="Travel cadence sparkline">
          <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};

export default TravelTrail;
