import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { matchSorter } from "match-sorter";
import { useEffect, useMemo, useRef, useState } from "react";
import { osCommandSections, osCommands, type OsCommand } from "../data/osCommands";
import { osEvents } from "../data/osEvents";
import { cyclingSummary, osSnapshot } from "../data/osSnapshot";

const CommandSectionHeading = ({ label }: { label: string }) => (
  <div className="sticky top-0 z-10 -mx-3 -mt-2 flex items-center justify-between bg-surface/80 px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-text-muted backdrop-blur">
    <span>{label}</span>
  </div>
);

const TickerChip = ({
  displayTime,
  title,
  summary,
  onSelect
}: {
  displayTime: string;
  title: string;
  summary: string;
  onSelect?: () => void;
}) => (
  <button
    type="button"
    onClick={onSelect}
    className="group flex min-w-[260px] items-center gap-3 rounded-2xl border border-border/70 bg-gradient-to-br from-surface/90 via-surface/80 to-background/80 px-4 py-3 text-left shadow-soft outline-none transition focus-visible:ring-2 focus-visible:ring-accent/70 hover:border-accent"
  >
    <div className="flex flex-col text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
      <span className="text-text-secondary">{displayTime}</span>
      <span className="text-text-muted">{title}</span>
    </div>
    <span className="h-1.5 w-1.5 rounded-full bg-accent/80" aria-hidden />
    <p className="flex-1 text-sm text-text-primary transition group-hover:text-text-primary">{summary}</p>
  </button>
);

const OsSystemTicker = ({ paused, onSelect }: { paused: boolean; onSelect: (href: string) => void }) => {
  const prefersReducedMotion = useReducedMotion();
  const [interacting, setInteracting] = useState(false);
  const duplicatedEvents = useMemo(() => [...osEvents, ...osEvents], []);
  const shouldAnimate = !prefersReducedMotion && !paused && !interacting;

  return (
    <div
      className="group/ticker relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-surface/90 to-background/90"
      aria-label="Personal OS system events"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setInteracting(false);
        }
      }}
    >
      <div className={`flex min-w-max items-center gap-3 px-3 py-3 ${shouldAnimate ? "animate-os-ticker" : ""}`} style={{ animationPlayState: shouldAnimate ? "running" : "paused" }}>
        {duplicatedEvents.map((event, index) => (
          <TickerChip
            key={`${event.id}-${index}`}
            displayTime={event.displayTime}
            title={event.title}
            summary={event.summary}
            onSelect={event.href ? () => onSelect(event.href as string) : undefined}
          />
        ))}
      </div>
    </div>
  );
};

const StatusCard = ({ subdued, onEventNavigate }: { subdued: boolean; onEventNavigate: (href: string) => void }) => (
  <div
    className={`rounded-3xl border border-border/70 bg-surface/95 p-4 shadow-soft transition ${subdued ? "opacity-80 saturate-75" : ""}`}
    aria-label="Personal OS status"
  >
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Personal OS status</p>
        <p className="text-sm text-text-secondary">online · recovery steady · movement stable</p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full border border-accent/50 bg-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
        <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
        Live
      </span>
    </div>
    <div className="mt-4 grid gap-4">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-background/80 via-surface/80 to-surface/70 px-4 py-4 shadow-inner">
        <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-text-muted">
          <span>Cycling</span>
          <span className="rounded-full bg-surface px-3 py-1 text-[10px] font-semibold text-text-secondary">Goal ~{osSnapshot.cyclingGoalMilesYtd}</span>
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-semibold text-text-primary">{cyclingSummary} YTD</p>
            <p className="text-sm text-text-secondary">goal ~{osSnapshot.cyclingGoalMilesYtd}</p>
          </div>
          <div className="text-right text-sm text-text-muted">
            <p>Cadence ~{osSnapshot.movementCadencePercent}%</p>
            <p>{osSnapshot.movementDaysPerMonth} movement days / month</p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-border/70 bg-background/80 p-2">
        <OsSystemTicker paused={subdued} onSelect={onEventNavigate} />
      </div>
    </div>
  </div>
);

const groupCommands = (items: OsCommand[]) =>
  osCommandSections
    .map((section) => ({ section, commands: items.filter((item) => item.section === section) }))
    .filter((group) => group.commands.length > 0);

const OsConsole = (): JSX.Element | null => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const prefersReducedMotion = useReducedMotion();
  const lastActiveElement = useRef<Element | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tickerPaused = query.trim().length > 0;

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(focusTimer);
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.classList.add("overflow-hidden");
    } else {
      setQuery("");
      document.body.classList.remove("overflow-hidden");
      if (lastActiveElement.current instanceof HTMLElement) {
        lastActiveElement.current.focus();
      }
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
    let cleanupFns: Array<() => void> = [];

    const bindCommandButtons = () => {
      cleanupFns.forEach((fn) => fn());
      cleanupFns = [];

      const triggers = Array.from(document.querySelectorAll<HTMLElement>("[data-command-button]"));
      triggers.forEach((trigger) => {
        const handleClick = () => {
          lastActiveElement.current = trigger;
          setOpen(true);
        };
        trigger.addEventListener("click", handleClick);
        trigger.setAttribute("aria-haspopup", "dialog");
        trigger.setAttribute("aria-expanded", open ? "true" : "false");
        cleanupFns.push(() => trigger.removeEventListener("click", handleClick));
      });
    };

    bindCommandButtons();
    document.addEventListener("astro:page-load", bindCommandButtons);
    return () => {
      document.removeEventListener("astro:page-load", bindCommandButtons);
      cleanupFns.forEach((fn) => fn());
    };
  }, [open]);

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery("");
    window.location.assign(href);
  };

  const filteredCommands = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return osCommands;
    return matchSorter(osCommands, trimmed, {
      keys: [
        "title",
        "subtitle",
        (item) => (item.keywords ?? []).join(" ")
      ]
    });
  }, [query]);

  const groupedCommands = useMemo(() => groupCommands(filteredCommands), [filteredCommands]);

  if (!open) return null;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/60 backdrop-blur" />
        <Dialog.Content className="fixed inset-0 z-[95] flex items-start justify-center px-3 py-10 sm:px-6">
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 12, scale: prefersReducedMotion ? 1 : 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: prefersReducedMotion ? 1 : 0.98 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: "easeOut" }}
              className="w-full max-w-3xl space-y-4"
            >
              <StatusCard subdued={tickerPaused} onEventNavigate={handleSelect} />
              <div className="rounded-3xl border border-border/70 bg-surface/95 p-4 shadow-soft sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Personal OS Console</p>
                    <p className="text-sm text-text-secondary">Status: online · uptime steady</p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
                    <span className="rounded-full bg-surface px-3 py-1 text-text-muted">⌘K</span>
                    <span className="text-text-muted">ESC</span>
                  </div>
                </div>
                <div className="mt-4">
                  <Command className="space-y-4">
                    <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/80 px-3 py-2 shadow-inner">
                      <Command.Input
                        ref={inputRef}
                        value={query}
                        onValueChange={setQuery}
                        placeholder="Search commands, pages, and worlds…"
                        className="w-full bg-transparent px-2 py-2 text-base text-text-primary outline-none placeholder:text-text-muted"
                      />
                    </div>
                    <Command.List className="max-h-[50vh] overflow-y-auto px-1 pb-1">
                      <Command.Empty className="px-4 py-6 text-sm text-text-muted">
                        No matches yet. Try a world like “sleep”, “cycling”, or “travel”.
                      </Command.Empty>
                      {groupedCommands.map(({ section, commands }) => (
                        <Command.Group
                          key={section}
                          heading={section === "Surfaces" ? "Surfaces" : section === "Worlds" ? "Worlds" : "Top commands"}
                          className="relative mb-3 rounded-2xl bg-background/60 px-3 pb-2 pt-6 ring-1 ring-border/40"
                        >
                          <CommandSectionHeading label={section === "Surfaces" ? "Surfaces" : section === "Worlds" ? "Worlds" : "Top commands"} />
                          <div className="flex flex-col">
                            {commands.map((command) => (
                              <Command.Item
                                key={command.id}
                                value={`${command.title} ${command.subtitle ?? ""} ${(command.keywords ?? []).join(" ")}`}
                                onSelect={() => handleSelect(command.href)}
                                className="group mt-2 flex cursor-pointer items-start justify-between rounded-xl px-3 py-3 text-sm transition focus:outline-none data-[selected=true]:bg-accent-soft data-[selected=true]:text-text-primary hover:bg-accent-soft"
                              >
                                <div className="space-y-1">
                                  <div className="font-semibold text-text-primary">{command.title}</div>
                                  {command.subtitle ? (
                                    <div className="text-xs text-text-secondary">{command.subtitle}</div>
                                  ) : null}
                                </div>
                                <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted group-data-[selected=true]:bg-accent-soft group-data-[selected=true]:text-accent">
                                  {section === "Surfaces" ? "Surface" : section === "Worlds" ? "World" : "Top"}
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
            </motion.div>
          </AnimatePresence>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default OsConsole;
