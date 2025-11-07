import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import type { ListeningItem, ReadingItem, TravelItem } from "../lib/data";

type TabKey = "reading" | "listening" | "travel";

type ArtifactsTabsProps = {
  reading: ReadingItem[];
  listening: ListeningItem[];
  travel: TravelItem[];
};

const emitAnalytics = (label: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("ah:analytics", { detail: { name: "feed_item_click", label } }));
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));

const ArtifactsTabs = ({ reading, listening, travel }: ArtifactsTabsProps) => {
  const [active, setActive] = useState<TabKey>("reading");
  const reduceMotion = useReducedMotion();

  const tabs = useMemo(
    () => [
      { key: "reading" as const, label: "Reading", items: reading, tabId: "artifacts-tab-reading", panelId: "artifacts-panel-reading" },
      { key: "listening" as const, label: "Listening", items: listening, tabId: "artifacts-tab-listening", panelId: "artifacts-panel-listening" },
      { key: "travel" as const, label: "Travel", items: travel, tabId: "artifacts-tab-travel", panelId: "artifacts-panel-travel" }
    ],
    [listening, reading, travel]
  );

  const activeTab = tabs.find((tab) => tab.key === active) ?? tabs[0];

  return (
    <div className="rounded-[28px] border border-border/60 bg-surface/70 p-6 shadow-soft">
      <div role="tablist" aria-label="Recent artifacts" className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={tab.tabId}
            aria-selected={active === tab.key}
            aria-controls={tab.panelId}
            onClick={() => setActive(tab.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              active === tab.key
                ? "bg-accent text-white shadow-sm"
                : "bg-surface text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        id={activeTab.panelId}
        role="tabpanel"
        aria-labelledby={activeTab.tabId}
        className="mt-6 grid gap-4 md:grid-cols-3"
      >
        {activeTab.items.map((item, index) => {
          const label = active === "reading" ? (item as ReadingItem).title : active === "listening" ? (item as ListeningItem).track : (item as TravelItem).city;
          return (
            <motion.button
              key={label}
              type="button"
              onClick={() => emitAnalytics(`${active}_${label.toLowerCase().replace(/\s+/g, "_")}`)}
              initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={reduceMotion ? undefined : { duration: 0.4, ease: [0.33, 1, 0.68, 1], delay: index * 0.06 }}
              className="group flex h-full flex-col justify-between rounded-2xl border border-border/40 bg-background/80 p-5 text-left shadow-sm transition hover:border-accent/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <div className="space-y-2">
                {active === "reading" ? (
                  <>
                    <p className="text-sm font-semibold text-text-secondary">{(item as ReadingItem).where}</p>
                    <p className="text-lg font-semibold text-text-primary">{(item as ReadingItem).title}</p>
                    <p className="text-sm text-text-secondary">{(item as ReadingItem).note}</p>
                  </>
                ) : active === "listening" ? (
                  <>
                    <p className="text-sm font-semibold text-text-secondary">{(item as ListeningItem).artist}</p>
                    <p className="text-lg font-semibold text-text-primary">{(item as ListeningItem).track}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-text-secondary">{(item as TravelItem).region}</p>
                    <p className="text-lg font-semibold text-text-primary">{(item as TravelItem).city}</p>
                  </>
                )}
              </div>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-text-secondary">
                <span className="h-px flex-1 rounded-full bg-border/60" aria-hidden="true" />
                {formatDate((item as { date: string }).date)}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default ArtifactsTabs;
