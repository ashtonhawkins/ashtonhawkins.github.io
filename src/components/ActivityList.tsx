import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";

import { normalizeActivity, type ActivityCategory, type NormalizedActivity } from "../lib/activity";

type ActivityFilter = "all" | ActivityCategory;

type FetchState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; items: NormalizedActivity[] };

const FILTERS: { label: string; value: ActivityFilter }[] = [
  { label: "All", value: "all" },
  { label: "GitHub", value: "github" },
  { label: "Reading", value: "reading" },
  { label: "Music", value: "music" }
];

const SOURCE_LABEL: Record<ActivityCategory, string> = {
  github: "GitHub",
  reading: "Reading",
  music: "Music"
};

type IconProps = { className?: string };

const GitHubIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    fill="currentColor"
  >
    <path d="M12 1.5a10.5 10.5 0 0 0-3.32 20.48c.53.1.73-.23.73-.5v-1.74c-3 .66-3.63-1.45-3.63-1.45-.48-1.2-1.18-1.53-1.18-1.53-.97-.66.07-.65.07-.65 1.07.08 1.63 1.13 1.63 1.13.95 1.65 2.5 1.18 3.12.9.1-.7.37-1.17.67-1.44-2.39-.28-4.9-1.2-4.9-5.34 0-1.18.42-2.16 1.1-2.92-.11-.27-.48-1.38.1-2.88 0 0 .9-.29 2.95 1.11a10.2 10.2 0 0 1 5.37 0c2.05-1.4 2.95-1.11 2.95-1.11.58 1.5.22 2.61.11 2.88.68.76 1.1 1.74 1.1 2.92 0 4.16-2.52 5.05-4.92 5.33.39.34.74 1 .74 2.02v2.99c0 .28.2.62.74.51A10.5 10.5 0 0 0 12 1.5Z" />
  </svg>
);

const BookIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    fill="currentColor"
  >
    <path d="M5.25 3.5a2.75 2.75 0 0 0-2.75 2.75v11.5A2.75 2.75 0 0 0 5.25 20.5H9.5c1.5 0 2.75 1 2.75 2.25V5A1.5 1.5 0 0 0 10.75 3.5H5.25Zm13.5 0h-5.5A1.5 1.5 0 0 0 11.5 5v17.75c0-1.25 1.25-2.25 2.75-2.25h4.25a2.75 2.75 0 0 0 2.75-2.75V6.25A2.75 2.75 0 0 0 18.75 3.5Z" />
  </svg>
);

const MusicIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    fill="currentColor"
  >
    <path d="M19 3.25a.75.75 0 0 0-.88-.74l-9 1.5a.75.75 0 0 0-.62.74v9.45a3.25 3.25 0 1 0 1.5 2.75V9.94l7.5-1.25v4.55a3.25 3.25 0 1 0 1.5 2.75V3.25Z" />
  </svg>
);

const ICON_MAP: Record<ActivityCategory, (props: IconProps) => JSX.Element> = {
  github: GitHubIcon,
  reading: BookIcon,
  music: MusicIcon
};

const ActivityList = (): JSX.Element => {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const response = await fetch("/data/activity.json", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const payload = await response.json();
        if (!cancelled) {
          const items = normalizeActivity(payload);
          setState({ status: "ready", items });
        }
      } catch (error) {
        console.error("Failed to load activity feed", error);
        if (!cancelled) {
          setState({ status: "error" });
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  const items = state.status === "ready" ? state.items : [];

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.category === filter);
  }, [filter, items]);

  const groups = useMemo(() => {
    const byDate = new Map<string, NormalizedActivity[]>();

    filteredItems.forEach((item) => {
      const key = dayjs(item.createdAt).format("YYYY-MM-DD");
      const existing = byDate.get(key) ?? [];
      existing.push(item);
      byDate.set(key, existing);
    });

    return Array.from(byDate.entries())
      .map(([dateKey, entries]) => ({
        dateKey,
        label: formatDayLabel(dateKey),
        entries: entries.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      }))
      .sort((a, b) => dayjs(b.dateKey).valueOf() - dayjs(a.dateKey).valueOf());
  }, [filteredItems]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={`rounded-full border px-4 py-1.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              filter === item.value
                ? "border-transparent bg-accent text-white shadow-sm"
                : "border-border/70 bg-surface/80 text-text-secondary hover:bg-surface"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {state.status === "error" ? (
        <div className="rounded-3xl border border-border/70 bg-surface/60 p-6 text-sm text-text-secondary">
          <p className="font-medium text-text-primary">Something went wrong.</p>
          <p className="mt-2">Unable to load the activity feed right now. Please refresh to try again.</p>
        </div>
      ) : state.status === "loading" ? (
        <LoadingSkeleton />
      ) : groups.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/60 bg-surface/40 p-8 text-center text-sm text-text-secondary">
          <p>No activity yet. Once the feed updates, it will appear here.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.dateKey} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-[1px] flex-1 bg-border/50" aria-hidden="true" />
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">{group.label}</p>
                <div className="h-[1px] flex-1 bg-border/50" aria-hidden="true" />
              </div>
              <ul className="space-y-3">
                {group.entries.map((item) => (
                  <li
                    key={item.id}
                    className="group flex items-start gap-4 rounded-3xl border border-border/60 bg-background/60 p-5 transition hover:border-border/40 hover:bg-background/80"
                  >
                    <IconFor source={item.category} />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.url ? (
                          <a
                            href={item.url}
                            className="font-medium text-text-primary underline-offset-4 transition hover:text-accent hover:underline"
                          >
                            {item.title}
                          </a>
                        ) : (
                          <p className="font-medium text-text-primary">{item.title}</p>
                        )}
                        <span className="text-xs uppercase tracking-wide text-text-muted">
                          {SOURCE_LABEL[item.category]}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-text-secondary">{item.description}</p>
                      )}
                      <p className="text-xs text-text-muted">{dayjs(item.createdAt).format("h:mm A")}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

const IconFor = ({ source }: { source: ActivityCategory }) => {
  const Icon = ICON_MAP[source];
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
      <Icon className="h-5 w-5" />
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-10">
    {[0, 1, 2].map((group) => (
      <section key={group} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-[1px] flex-1 bg-border/40" aria-hidden="true" />
          <div className="h-2 w-24 rounded-full bg-border/40" />
          <div className="h-[1px] flex-1 bg-border/40" aria-hidden="true" />
        </div>
        <ul className="space-y-3">
          {[0, 1, 2].map((item) => (
            <li
              key={item}
              className="flex items-start gap-4 rounded-3xl border border-border/50 bg-background/40 p-5"
            >
              <div className="h-11 w-11 rounded-2xl bg-border/30" />
              <div className="space-y-2">
                <div className="h-4 w-48 rounded-full bg-border/30" />
                <div className="h-3 w-32 rounded-full bg-border/20" />
                <div className="h-2 w-20 rounded-full bg-border/20" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    ))}
  </div>
);

function formatDayLabel(dateKey: string): string {
  const date = dayjs(dateKey);
  if (date.isSame(dayjs(), "day")) return "Today";
  if (date.isSame(dayjs().subtract(1, "day"), "day")) return "Yesterday";
  return date.format("MMMM D, YYYY");
}

export default ActivityList;
