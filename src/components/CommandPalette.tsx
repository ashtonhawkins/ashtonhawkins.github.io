import { Command } from "cmdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type CommandItem = {
  label: string;
  hint?: string;
  action: () => void;
};

const NAVIGATION_COMMANDS: Array<{ label: string; href: string; hint?: string }> = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Now", href: "/now" },
  { label: "Projects", href: "/projects" },
  { label: "Writing", href: "/writing" },
  { label: "Activity", href: "/activity" },
  { label: "Resume", href: "/resume", hint: "Opens in this tab" }
];

const focusPagefindInput = (): boolean => {
  const selectors = [
    "#pagefind-search input[type=\"text\"]",
    "#footer-search input[type=\"text\"]",
    ".pagefind-wrapper input[type=\"text\"]"
  ];

  for (const selector of selectors) {
    const input = document.querySelector<HTMLInputElement>(selector);
    if (input) {
      input.focus();
      input.select();
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      return true;
    }
  }

  return false;
};

const CommandPalette = (): JSX.Element | null => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const openRef = useRef(open);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const commands = useMemo<CommandItem[]>(() => {
    const navigationCommands = NAVIGATION_COMMANDS.map((item) => ({
      label: item.label,
      hint: item.hint ?? item.href,
      action: () => {
        closePalette();
        window.location.href = item.href;
      }
    }));

    return [
      {
        label: "Search site…",
        hint: "Focus site search",
        action: () => {
          focusPagefindInput();
          closePalette();
        }
      },
      ...navigationCommands
    ];
  }, [closePalette]);

  useEffect(() => {
    const openListener = (event: Event) => {
      setOpen(true);
      const detail = (event as CustomEvent<string | undefined>).detail;
      if (typeof detail === "string") {
        setQuery(detail);
      } else {
        setQuery("");
      }
    };
    const closeListener = () => closePalette();
    const toggleListener = () => {
      if (openRef.current) {
        closePalette();
      } else {
        setQuery("");
        setOpen(true);
      }
    };

    window.addEventListener("command-palette:open", openListener as EventListener);
    window.addEventListener("command-palette:close", closeListener);
    window.addEventListener("command-palette:toggle", toggleListener);

    return () => {
      window.removeEventListener("command-palette:open", openListener as EventListener);
      window.removeEventListener("command-palette:close", closeListener);
      window.removeEventListener("command-palette:toggle", toggleListener);
    };
  }, [closePalette]);

  useEffect(() => {
    document.documentElement.classList.toggle("command-palette-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.classList.remove("command-palette-open");
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/40 px-4 py-24 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={() => closePalette()}
      />
      <Command
        label="Command Palette"
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border border-border/60 bg-surface text-text-primary shadow-overlay"
      >
        <div className="flex items-center justify-between border-b border-border/60 bg-background/80 px-5 py-4">
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Type a command or search…"
            className="w-full bg-transparent text-base outline-none placeholder:text-text-muted"
          />
          <kbd className="ml-4 text-xs uppercase tracking-wide text-text-muted">ESC</kbd>
        </div>
        <Command.List className="max-h-[55vh] overflow-y-auto px-3 py-4">
          <Command.Empty className="px-4 py-6 text-sm text-text-muted">
            No matches—try another phrase.
          </Command.Empty>
          <Command.Group heading="Actions" className="px-2 text-xs uppercase tracking-wide text-text-muted">
            {commands.map((item) => (
              <Command.Item
                key={item.label}
                value={`${item.label.toLowerCase()} ${item.hint ?? ""}`.trim()}
                onSelect={() => item.action()}
                className="mt-2 flex cursor-pointer items-center justify-between rounded-2xl px-4 py-3 text-sm transition hover:bg-accent-soft"
              >
                <span className="font-medium text-text-primary">{item.label}</span>
                {item.hint ? <span className="text-xs text-text-muted">{item.hint}</span> : null}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
};

export default CommandPalette;
