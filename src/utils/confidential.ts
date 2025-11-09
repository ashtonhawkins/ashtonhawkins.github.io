export const redact = (publicValue: string, confidentialValue: string, isConfidential: boolean) =>
  isConfidential ? confidentialValue : publicValue;

const monthFormatter = new Intl.DateTimeFormat("en", { month: "short" });
const yearFormatter = new Intl.DateTimeFormat("en", { year: "numeric" });

const formatMonthYear = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${monthFormatter.format(date)} ${yearFormatter.format(date)}`;
};

export const formatPreciseRange = (start?: string | null, end?: string | null) => {
  const startLabel = formatMonthYear(start);
  const endLabel = end ? formatMonthYear(end) : "Present";
  if (!startLabel && !endLabel) return "";
  if (!startLabel) return endLabel;
  return `${startLabel} – ${endLabel}`;
};

const monthsBetween = (start?: string | null, end?: string | null) => {
  if (!start && !end) return 0;
  const startDate = start ? new Date(start) : undefined;
  const endDate = end ? new Date(end) : new Date();
  if (startDate && Number.isNaN(startDate.getTime())) return 0;
  if (Number.isNaN(endDate.getTime())) return 0;
  const effectiveStart = startDate ?? endDate;
  const diffMs = endDate.getTime() - effectiveStart.getTime();
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.4375);
  return Math.max(0, diffMonths);
};

export const formatApproxRange = (start?: string | null, end?: string | null) => {
  const months = monthsBetween(start, end);
  if (!months) return "~tenure";
  if (months < 12) {
    const rounded = Math.max(1, Math.round(months));
    return `~${rounded} month${rounded === 1 ? "" : "s"}`;
  }
  const years = months / 12;
  const roundedYears = Math.round(years * 10) / 10;
  const label = roundedYears % 1 === 0 ? Math.round(roundedYears).toString() : roundedYears.toFixed(1);
  return `~${label} year${Number(label) === 1 ? "" : "s"}`;
};

interface ConfidentialOptions {
  defaultState: boolean;
  rootSelector?: string;
  toggleSelector?: string;
  announcerSelector?: string;
}

const STORAGE_KEY = "resume_confidential";

const setUrlModeParam = (state: boolean) => {
  const url = new URL(window.location.href);
  url.searchParams.set("mode", state ? "confidential" : "public");
  history.replaceState(history.state, "", url.toString());
};

export const initializeConfidentialMode = ({
  defaultState,
  rootSelector = "[data-confidential-root]",
  toggleSelector = "[data-confidential-toggle]",
  announcerSelector = "[data-confidential-announcer]"
}: ConfidentialOptions) => {
  const root = document.querySelector<HTMLElement>(rootSelector);
  if (!root) return;

  const searchParams = new URL(window.location.href).searchParams;
  const modeParam = searchParams.get("mode");
  const stored = window.localStorage.getItem(STORAGE_KEY);

  let state = defaultState;
  if (modeParam === "public") state = false;
  if (modeParam === "confidential") state = true;
  if (modeParam !== "public" && modeParam !== "confidential" && stored !== null) {
    state = stored === "true";
  }

  const applyState = (nextState: boolean, announce = false) => {
    state = nextState;
    root.dataset.confidentialState = nextState ? "confidential" : "public";
    document.documentElement.dataset.confidential = nextState ? "confidential" : "public";
    window.localStorage.setItem(STORAGE_KEY, nextState ? "true" : "false");
    const toggle = document.querySelector<HTMLButtonElement>(toggleSelector);
    if (toggle) {
      toggle.setAttribute("aria-checked", nextState ? "true" : "false");
      toggle.dataset.state = nextState ? "confidential" : "public";
      toggle.setAttribute("aria-label", nextState ? "Disable confidential mode" : "Enable confidential mode");
    }
    setUrlModeParam(nextState);
    const announcer = document.querySelector<HTMLElement>(announcerSelector);
    if (announce && announcer) {
      announcer.textContent = nextState ? "Confidential mode enabled" : "Confidential mode disabled";
    }
    document.dispatchEvent(new CustomEvent("resume:confidential-change", { detail: { state: nextState } }));
  };

  applyState(state);

  const toggle = document.querySelector<HTMLButtonElement>(toggleSelector);
  if (toggle && toggle.dataset.bound !== "true") {
    toggle.dataset.bound = "true";
    toggle.addEventListener("click", () => {
      applyState(!state, true);
    });
    toggle.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        applyState(!state, true);
      }
    });
  }
};
