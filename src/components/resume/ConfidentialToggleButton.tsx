import { useEffect, useState } from "react";
import type { ConfidentialMode } from "../../utils/confidential";
import { STORAGE } from "../../utils/confidential";

const announce = (message: string) => {
  const region = document.getElementById("confidential-announcer");
  if (region) {
    region.textContent = message;
  }
};

const applyMode = (mode: ConfidentialMode) => {
  document.documentElement.dataset.confidential = mode;
  localStorage.setItem(STORAGE, mode);
  const params = new URLSearchParams(window.location.search);
  params.set("mode", mode);
  history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  announce(mode === "confidential" ? "Confidential mode on" : "Public mode on");
  window.dispatchEvent(new CustomEvent("resume:confidential", { detail: { mode } }));
};

export default function ConfidentialToggleButton({ initialMode }: { initialMode: ConfidentialMode }) {
  const [mode, setMode] = useState<ConfidentialMode>(initialMode);

  useEffect(() => {
    const datasetMode = document.documentElement.dataset.confidential as ConfidentialMode | undefined;
    if (datasetMode && datasetMode !== mode) {
      setMode(datasetMode);
    }
  }, []);

  const toggle = () => {
    const next = mode === "confidential" ? "public" : "confidential";
    applyMode(next);
    setMode(next);
  };

  return (
    <>
      <button
        type="button"
        aria-pressed={mode === "confidential"}
        onClick={toggle}
        className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--ink)_12%,transparent)] bg-[var(--surface-alt)] px-3 py-1.5 text-sm font-medium text-[var(--ink)] shadow-sm shadow-black/5 transition-all duration-200 hover:border-[color-mix(in_srgb,var(--accent)_40%,transparent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--ink)_12%,transparent)] bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] text-xs font-semibold">
          {mode === "confidential" ? "C" : "P"}
        </span>
        <span>{mode === "confidential" ? "Confidential" : "Public"}</span>
      </button>
      <span id="confidential-announcer" aria-live="polite" className="sr-only"></span>
    </>
  );
}
