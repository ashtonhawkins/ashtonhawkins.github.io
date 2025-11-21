import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { matchSorter } from "match-sorter";
import { useEffect, useMemo, useRef, useState } from "react";
import { osCommands, type OsCommand } from "../data/osCommands";
import { osTickerItems } from "../data/osSnapshot";

const SectionHeading = ({ label }: { label: string }) => (
  <div className="sticky top-0 z-10 -mx-4 -mt-2 flex items-center justify-between bg-surface/80 px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-text-muted backdrop-blur">
    <span>{label}</span>
  </div>
);

const TickerPill = ({
  label,
  primary,
  secondary,
  subdued
}: {
  label: string;
  primary: string;
  secondary?: string;
  subdued?: boolean;
}) => (
  <div
    className={`flex min-h-[76px] flex-col justify-center rounded-2xl border border-border/70 bg-background/60 px-4 py-3 shadow-soft transition ${subdued ? "opacity-70" : ""}`}
  >
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
      <span className="relative flex h-2 w-2 items-center justify-center">
        <span className={`inline-flex h-2 w-2 rounded-full ${subdued ? "bg-border" : "bg-accent"}`} />
      </span>
      {label}
    </div>
    <div className="mt-2 text-lg font-semibold text-text-primary">{primary}</div>
    {secondary ? <div className="text-sm text-text-secondary">{secondary}</div> : null}
  </div>
);

const OsStatusTicker = ({
  activeIndex,
  subdued
}: {
  activeIndex: number;
  subdued?: boolean;
}) => {
  const prefersReducedMotion = useReducedMotion();
  const item = osTickerItems[activeIndex];

  return (
    <div
      className={`rounded-3xl border border-border/60 bg-surface/90 p-4 shadow-soft ${subdued ? "opacity-75" : ""}`}
      aria-label="Personal OS status"
    >
      <div className="flex items-center justify-between gap-3 pb-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Personal OS status</p>
          <p className="text-sm text-text-secondary">online · recovery steady · movement stable</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
          <span className={`relative inline-flex h-2 w-2 rounded-full ${subdued ? "bg-border" : "bg-accent"}`} />
          Live
        </div>
      </div>
      <div className="relative min-h-[88px] overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={item.id}
            initial={{ opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : -10 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <TickerPill label={item.label} primary={item.primary} secondary={item.secondary} subdued={subdued} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

const groupCommands = (items: OsCommand[]) => {
  return items.reduce<Record<string, OsCommand[]>>((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});
};

const OsCommandSearch = ({
  query,
  setQuery,
  onSelect
}: {
  query: string;
  setQuery: (value: string) => void;
  onSelect: (href: string) => void;
}) => {
  const featured = useMemo(() => osCommands.filter((command) => command.featured), []);
  const baseGroups = useMemo(() => groupCommands(osCommands), []);

  const filtered = useMemo(() => {
    if (!query.trim()) return osCommands;
    return matchSorter(osCommands, query, {
      keys: [
        "title",
        "description",
        (item) => (item.keywords ?? []).join(" ")
      ]
    });
  }, [query]);

  const groupedFiltered = useMemo(() => groupCommands(filtered), [filtered]);

  const sectionsToRender = useMemo(() => {
    if (query.trim()) return groupedFiltered;
    return {
      "Top commands": featured,
      ...baseGroups
    };
  }, [baseGroups, featured, groupedFiltered, query]);

  return (
    <div className="rounded-3xl border border-border/60 bg-surface shadow-soft">
      <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
        <div className="flex flex-col">
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Personal OS Console</p>
          <p className="text-sm text-text-secondary">Status: online · uptime steady</p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-text-muted">
          <span className="rounded-full bg-accent-soft px-2 py-1 font-semibold text-accent">⌘K</span>
          <span className="rounded-full bg-muted px-2 py-1 font-semibold text-text-secondary">ESC</span>
        </div>
      </div>
      <div className="px-5 py-4">
        <Command className="w-full">
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Search commands, pages, and worlds…"
            className="w-full rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-base text-text-primary outline-none ring-0 placeholder:text-text-muted focus:border-accent"
          />
          <Command.List className="mt-4 max-h-[45vh] overflow-y-auto px-1 pb-2">
            <Command.Empty className="px-4 py-6 text-sm text-text-muted">
              No matches yet. Try a different keyword or a world like ‘sleep’, ‘cycling’, or ‘travel’.
            </Command.Empty>
            {Object.entries(sectionsToRender).map(([section, commands]) => (
              <Command.Group key={section} heading={section} className="relative mb-3 rounded-2xl bg-background/60 px-4 pb-2 pt-6 ring-1 ring-border/40">
                <SectionHeading label={section} />
                <div className="flex flex-col">
                  {commands.map((command) => (
                    <Command.Item
                      key={command.id}
                      value={`${command.title} ${command.description ?? ""} ${(command.keywords ?? []).join(" ")}`}
                      onSelect={() => onSelect(command.href)}
                      className="group mt-2 flex cursor-pointer items-start justify-between rounded-xl px-3 py-3 text-sm transition focus:outline-none data-[selected=true]:bg-accent-soft data-[selected=true]:text-text-primary hover:bg-accent-soft"
                    >
                      <div>
                        <div className="font-semibold text-text-primary">{command.title}</div>
                        {command.description ? (
                          <div className="text-xs text-text-secondary">{command.description}</div>
                        ) : null}
                      </div>
                      <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted group-data-[selected=true]:bg-accent-soft group-data-[selected=true]:text-accent">
                        {command.section}
                      </span>
                    </Command.Item>
                  ))}
                </div>
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
};

const OsConsole = (): JSX.Element | null => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTicker, setActiveTicker] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const lastActiveElement = useRef<Element | null>(null);
  const tickerPaused = query.trim().length > 0;

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      if (tickerPaused) return;
      setActiveTicker((current) => (current + 1) % osTickerItems.length);
    }, prefersReducedMotion ? 6000 : 4800);
    return () => clearInterval(interval);
  }, [open, tickerPaused, prefersReducedMotion]);

  useEffect(() => {
    if (!open) setQuery("");
    if (!open && lastActiveElement.current instanceof HTMLElement) {
      lastActiveElement.current.focus();
    }
  }, [open]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        lastActiveElement.current = document.activeElement;
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    let buttonCleanup: (() => void) | undefined;

    const bindCommandButton = () => {
      buttonCleanup?.();
      const trigger = document.querySelector<HTMLElement>("[data-command-button]");
      if (!trigger) return;
      const handleClick = () => {
        lastActiveElement.current = trigger;
        setOpen(true);
      };
      trigger.addEventListener("click", handleClick);
      trigger.setAttribute("aria-haspopup", "dialog");
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      buttonCleanup = () => trigger.removeEventListener("click", handleClick);
    };

    bindCommandButton();
    document.addEventListener("astro:page-load", bindCommandButton);
    return () => {
      document.removeEventListener("astro:page-load", bindCommandButton);
      buttonCleanup?.();
    };
  }, [open]);

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery("");
    window.location.href = href;
  };

  if (!open) return null;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/60 backdrop-blur" />
        <Dialog.Content className="fixed inset-0 z-[95] flex items-start justify-center px-3 py-12 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: "easeOut" }}
            className="w-full max-w-2xl space-y-3"
          >
            <OsStatusTicker activeIndex={activeTicker} subdued={tickerPaused} />
            <OsCommandSearch query={query} setQuery={setQuery} onSelect={handleSelect} />
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default OsConsole;
