import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "site-theme";

const resolveTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  const root = document.documentElement;
  if (root.dataset.theme === "dark" || root.classList.contains("dark")) {
    return "dark";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const applyTheme = (theme: Theme) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.setProperty("color-scheme", theme === "dark" ? "dark light" : "light dark");
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }
};

export default function ThemeToggleButton() {
  const [theme, setTheme] = useState<Theme>(() => resolveTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      const current = root.dataset.theme === "dark" ? "dark" : "light";
      setTheme((prev) => (prev === current ? prev : current));
    };
    sync();
    if (typeof MutationObserver === "undefined") {
      return;
    }
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  return (
    <button
      type="button"
      aria-pressed={theme === "dark"}
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--ink)_12%,transparent)] bg-[var(--surface-alt)] px-3 py-1.5 text-sm font-medium text-[var(--ink)] shadow-sm shadow-black/5 transition-colors duration-200 hover:border-[color-mix(in_srgb,var(--accent)_40%,transparent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
    >
      <span className="relative h-4 w-7 rounded-full bg-[color-mix(in_srgb,var(--ink)_12%,transparent)]">
        <span
          className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[var(--accent)] transition-transform duration-200 ${
            theme === "dark" ? "translate-x-3" : "translate-x-0"
          }`}
        />
      </span>
      <span>{theme === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
}
