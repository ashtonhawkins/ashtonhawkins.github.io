const STORAGE_KEY = "resume_confidential";

declare global {
  interface Document {
    __confidentialHotkeyBound?: boolean;
  }
}

const parseModeParam = (value: string | null) => {
  if (!value) return null;
  if (value.toLowerCase() === "public") return false;
  if (value.toLowerCase() === "confidential") return true;
  return null;
};

const commitUrlParam = (state: boolean) => {
  const url = new URL(window.location.href);
  url.searchParams.set("mode", state ? "confidential" : "public");
  window.history.replaceState(window.history.state, "", url.toString());
};

interface ConfidentialOptions {
  defaultState: boolean;
  rootSelector?: string;
  toggleSelector?: string;
  announcerSelector?: string;
}

const updateToggle = (toggle: HTMLButtonElement | null, state: boolean) => {
  if (!toggle) return;
  toggle.dataset.state = state ? "confidential" : "public";
  toggle.setAttribute("aria-pressed", state ? "true" : "false");
  toggle.setAttribute("aria-label", state ? "Switch to public mode" : "Switch to confidential mode");
  const icon = toggle.querySelector<HTMLElement>("[data-lock-icon]");
  const label = toggle.querySelector<HTMLElement>("[data-lock-label]");
  if (icon) icon.textContent = state ? "🔒" : "🔓";
  if (label) label.textContent = state ? "Confidential" : "Public";
};

export const initializeConfidentialMode = ({
  defaultState,
  rootSelector = "[data-confidential-root]",
  toggleSelector = "[data-confidential-toggle]",
  announcerSelector = "[data-confidential-announcer]"
}: ConfidentialOptions) => {
  const root = document.querySelector<HTMLElement>(rootSelector);
  if (!root) return;
  const toggle = document.querySelector<HTMLButtonElement>(toggleSelector);
  const announcer = document.querySelector<HTMLElement>(announcerSelector);

  const currentParam = parseModeParam(new URL(window.location.href).searchParams.get("mode"));
  const stored = window.localStorage.getItem(STORAGE_KEY);
  let state = defaultState;
  if (currentParam !== null) state = currentParam;
  else if (stored !== null) state = stored === "true";

  const applyState = (next: boolean, announce = false) => {
    state = next;
    root.dataset.confidentialState = state ? "confidential" : "public";
    document.documentElement.dataset.confidential = state ? "confidential" : "public";
    window.localStorage.setItem(STORAGE_KEY, state ? "true" : "false");
    commitUrlParam(state);
    updateToggle(toggle, state);
    if (announce && announcer) {
      announcer.textContent = state ? "Confidential mode enabled" : "Confidential mode disabled";
    }
    document.dispatchEvent(new CustomEvent("resume:confidential-change", { detail: { state } }));
  };

  applyState(state);

  if (toggle && toggle.dataset.bound !== "true") {
    toggle.dataset.bound = "true";
    toggle.addEventListener("click", () => applyState(!state, true));
    toggle.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        applyState(!state, true);
      }
    });
  }

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
      applyState(!state, true);
    });
  }
};
