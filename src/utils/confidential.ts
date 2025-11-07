const STORAGE_KEY = "resume_confidential";
const PARAM_KEY = "mode";

type ConfidentialMode = "confidential" | "public";

declare global {
  interface Document {
    __confidentialHotkeyBound?: boolean;
  }
}

const parseModeParam = (value: string | null): ConfidentialMode | null => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "public") return "public";
  if (normalized === "confidential") return "confidential";
  return null;
};

const commitUrlParam = (mode: ConfidentialMode) => {
  const url = new URL(window.location.href);
  url.searchParams.set(PARAM_KEY, mode);
  window.history.replaceState(window.history.state, "", url.toString());
};

const updateToggle = (toggle: HTMLButtonElement | null, mode: ConfidentialMode) => {
  if (!toggle) return;
  toggle.dataset.state = mode;
  toggle.setAttribute("aria-pressed", mode === "confidential" ? "true" : "false");
  toggle.setAttribute(
    "aria-label",
    mode === "confidential" ? "Switch to public mode" : "Switch to confidential mode"
  );
  const icon = toggle.querySelector<HTMLElement>("[data-lock-icon]");
  const label = toggle.querySelector<HTMLElement>("[data-lock-label]");
  if (icon) icon.textContent = mode === "confidential" ? "🔒" : "🔓";
  if (label) label.textContent = mode === "confidential" ? "Confidential" : "Public";
};

interface ConfidentialOptions {
  defaultState: boolean;
  rootSelector?: string;
  toggleSelector?: string;
  announcerSelector?: string;
}

export const initializeConfidentialMode = ({
  defaultState,
  rootSelector = "[data-confidential-root]",
  toggleSelector = "[data-confidential-toggle]",
  announcerSelector = "[data-confidential-announcer]"
}: ConfidentialOptions) => {
  const root = document.querySelector<HTMLElement>(rootSelector);
  if (!root) return;

  const toggles = Array.from(document.querySelectorAll<HTMLButtonElement>(toggleSelector));
  const announcer = document.querySelector<HTMLElement>(announcerSelector);

  const resolveInitialMode = (): ConfidentialMode => {
    const urlMode = parseModeParam(new URL(window.location.href).searchParams.get(PARAM_KEY));
    if (urlMode) {
      try {
        window.localStorage.setItem(STORAGE_KEY, urlMode === "confidential" ? "true" : "false");
      } catch (error) {
        /* noop */
      }
      return urlMode;
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "true") return "confidential";
      if (stored === "false") return "public";
    } catch (error) {
      /* noop */
    }
    return defaultState ? "confidential" : "public";
  };

  let mode = resolveInitialMode();

  const applyMode = (next: ConfidentialMode, announce = false) => {
    mode = next;
    root.dataset.confidentialState = mode;
    document.documentElement.dataset.confidential = mode;
    toggles.forEach((toggle) => updateToggle(toggle, mode));
    try {
      window.localStorage.setItem(STORAGE_KEY, mode === "confidential" ? "true" : "false");
    } catch (error) {
      /* noop */
    }
    commitUrlParam(mode);
    if (announce && announcer) {
      announcer.textContent = mode === "confidential" ? "Confidential mode enabled" : "Public mode enabled";
    }
    document.dispatchEvent(new CustomEvent("resume:confidential-change", { detail: { mode } }));
  };

  applyMode(mode);

  toggles.forEach((toggle) => {
    if (toggle.dataset.bound === "true") return;
    toggle.dataset.bound = "true";
    toggle.addEventListener("click", () => applyMode(mode === "confidential" ? "public" : "confidential", true));
    toggle.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        applyMode(mode === "confidential" ? "public" : "confidential", true);
      }
    });
  });

  if (!document.__confidentialHotkeyBound) {
    document.__confidentialHotkeyBound = true;
    document.addEventListener("keydown", (event) => {
      if (event.defaultPrevented) return;
      if (event.key.toLowerCase() !== "c") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const active = document.activeElement;
      if (
        active &&
        (active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement ||
          active instanceof HTMLSelectElement ||
          active.hasAttribute("contenteditable"))
      ) {
        return;
      }
      applyMode(mode === "confidential" ? "public" : "confidential", true);
    });
  }
};
