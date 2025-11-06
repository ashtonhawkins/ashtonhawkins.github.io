const STORAGE_KEY = "resume_confidential";

declare global {
  interface Document {
    __confidentialHotkeyBound?: boolean;
  }
}

const setUrlModeParam = (state: boolean) => {
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

const updateToggleVisuals = (toggle: HTMLButtonElement | null, state: boolean) => {
  if (!toggle) return;
  toggle.setAttribute("aria-pressed", state ? "true" : "false");
  toggle.dataset.state = state ? "confidential" : "public";
  toggle.setAttribute("aria-label", state ? "Disable confidential mode" : "Enable confidential mode");
  const icon = toggle.querySelector<HTMLElement>("[data-icon]");
  const label = toggle.querySelector<HTMLElement>("[data-label]");
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

  const searchParams = new URL(window.location.href).searchParams;
  const modeParam = searchParams.get("mode");
  const stored = window.localStorage.getItem(STORAGE_KEY);

  let state = defaultState;
  if (modeParam === "public") state = false;
  if (modeParam === "confidential") state = true;
  if (!modeParam && stored !== null) state = stored === "true";

  const applyState = (nextState: boolean, announce = false) => {
    state = nextState;
    root.dataset.confidentialState = nextState ? "confidential" : "public";
    document.documentElement.dataset.confidential = nextState ? "confidential" : "public";
    window.localStorage.setItem(STORAGE_KEY, nextState ? "true" : "false");
    setUrlModeParam(nextState);
    updateToggleVisuals(toggle ?? null, nextState);
    if (announce && announcer) {
      announcer.textContent = nextState ? "Confidential mode enabled" : "Confidential mode disabled";
    }
    document.dispatchEvent(new CustomEvent("resume:confidential-change", { detail: { state: nextState } }));
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
      if (event.key.toLowerCase() === "c" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const active = document.activeElement;
        if (active && (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement || active.hasAttribute("contenteditable"))) {
          return;
        }
        applyState(!state, true);
      }
    });
  }
};
