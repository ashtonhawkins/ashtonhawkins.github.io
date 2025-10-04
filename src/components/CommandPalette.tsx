import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { animate } from "motion";

type QuickLink = {
  label: string;
  href: string;
  description?: string;
};

type QuickLinkGroup = {
  heading: string;
  items: QuickLink[];
};

const quickLinks: QuickLinkGroup[] = [
  {
    heading: "Core",
    items: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Now", href: "/now" }
    ]
  },
  {
    heading: "Explore",
    items: [
      { label: "Writing", href: "/writing", description: "Essays, notes, and dispatches." },
      { label: "Projects", href: "/projects", description: "Selected work and experiments." },
      { label: "Activity", href: "/activity", description: "Live feed of what I'm building." }
    ]
  },
  {
    heading: "Elsewhere",
    items: [
      { label: "GitHub", href: "https://github.com/ashtonhawkins" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/ashtonhawkins" },
      { label: "Email", href: "mailto:hello@ashtonhawkins.com" }
    ]
  }
];

const kbd = (shortcuts: string) => shortcuts.toUpperCase().replace(/\+/g, " + ");

const CommandPalette = (): JSX.Element | null => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      setOpen(true);
      const detail = (event as CustomEvent<string | undefined>).detail;
      if (typeof detail === "string") {
        setQuery(detail);
      }
    };
    window.addEventListener("command-palette:open", handleOpen as EventListener);
    return () => window.removeEventListener("command-palette:open", handleOpen as EventListener);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("command-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      requestAnimationFrame(() => {
        const dialog = document.querySelector("[data-command-root]");
        if (dialog) {
          animate(
            dialog,
            { opacity: [0, 1], transform: ["translateY(10px)", "translateY(0)"] },
            { duration: 0.22, easing: "ease-out" }
          );
        }
      });
    }
  }, [open]);

  const searchWithPagefind = (value: string) => {
    if (!value) return;
    window.dispatchEvent(new CustomEvent("pagefind:query", { detail: value }));
    const anchor = document.querySelector("#footer-search");
    anchor?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/40 px-4 py-24 backdrop-blur-sm" role="presentation">
      <div className="fixed inset-0" onClick={() => setOpen(false)} aria-hidden="true" />
      <Command
        label="Command Menu"
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-border/60 bg-surface text-text-primary shadow-overlay"
        data-command-root
      >
        <div className="flex items-center justify-between border-b border-border/50 bg-background/80 px-5 py-4">
          <div className="flex flex-1 items-center gap-2">
            <Command.Input
              id="cmdk-search"
              value={query}
              onValueChange={setQuery}
              autoFocus
              placeholder="Jump to anything..."
              className="w-full bg-transparent text-base outline-none placeholder:text-text-muted"
            />
          </div>
          <kbd className="text-xs uppercase tracking-wide text-text-muted">{kbd("esc")}</kbd>
        </div>
        <Command.List className="max-h-[55vh] overflow-y-auto px-3 py-4">
          <Command.Empty className="px-4 py-6 text-sm text-text-muted">
            Nothing yet—try another search term.
          </Command.Empty>
          {query && (
            <Command.Group heading="Search" className="px-2">
              <Command.Item
                key="search-pagefind"
                value={`search-${query}`}
                onSelect={() => {
                  searchWithPagefind(query);
                  setOpen(false);
                }}
                className="group flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm transition hover:bg-accent-soft"
              >
                <span>
                  Search for <span className="font-semibold text-text-secondary">“{query}”</span>
                </span>
                <span className="text-xs text-text-muted">Pagefind</span>
              </Command.Item>
            </Command.Group>
          )}
          {quickLinks.map((group) => (
            <Command.Group key={group.heading} heading={group.heading} className="mt-3 px-2 text-xs uppercase tracking-wide text-text-muted">
              {group.items.map((item) => (
                <Command.Item
                  key={item.href}
                  value={`${group.heading}-${item.label}`}
                  onSelect={() => {
                    setOpen(false);
                    if (item.href.startsWith("http")) {
                      window.open(item.href, "_blank", "noreferrer");
                    } else {
                      window.location.href = item.href;
                    }
                  }}
                  className="group mt-2 flex cursor-pointer items-start justify-between gap-3 rounded-2xl px-4 py-3 text-sm transition hover:bg-accent-soft"
                >
                  <div>
                    <div className="font-medium text-text-primary">{item.label}</div>
                    {item.description ? (
                      <p className="text-xs text-text-muted">{item.description}</p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-border/50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-muted">
                    {item.href.replace(/^https?:\/\//, "")}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command>
    </div>
  );
};

export default CommandPalette;
