import { useEffect, useRef, useState } from "react";
import type resumeData from "../../data/resume.json";
import { buildSparkPath } from "../ui/Sparkline";

type TapestryItem = typeof resumeData.tapestry[number];

const trapFocus = (container: HTMLDivElement, event: KeyboardEvent) => {
  if (event.key !== "Tab") return;
  const focusable = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey) {
    if (document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
};

export default function ImpactTapestryClient({ items }: { items: TapestryItem[] }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
      if (open && dialogRef.current) {
        trapFocus(dialogRef.current, event);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [open]);

  useEffect(() => {
    if (open && dialogRef.current) {
      const firstButton = dialogRef.current.querySelector<HTMLElement>("button, a");
      firstButton?.focus();
    }
  }, [open]);

  return (
    <section className="relative rounded-3xl border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] bg-[var(--surface-alt)] p-8 shadow-lg shadow-black/10">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--ink)]">Impact Tapestry</h2>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full border border-[color-mix(in_srgb,var(--ink)_12%,transparent)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
          >
            Methodology
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="flex snap-x snap-mandatory gap-4">
            {items.map((item, index) => {
              const path = item.timeseries ? buildSparkPath(item.timeseries) : "";
              return (
                <div
                  key={`${item.label}-${index}`}
                  className="card snap-center rounded-2xl border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] bg-[color-mix(in_srgb,var(--surface)_94%,var(--accent)_6%)] p-5 shadow-inner shadow-black/5"
                >
                  <p className="text-sm font-medium text-[color-mix(in_srgb,var(--ink)_70%,transparent)]">{item.label}</p>
                  <p className="mt-3 text-2xl font-semibold text-[var(--ink)]">{item.value}</p>
                  {path ? (
                    <svg viewBox="0 0 100 100" className="mt-4 h-16 w-36 text-[var(--accent)]">
                      <polyline points={path.replace(/M|L/g, "").replace(/ /g, " ")} fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 backdrop-blur-sm">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            className="m-6 w-full max-w-sm rounded-2xl border border-[color-mix(in_srgb,var(--ink)_12%,transparent)] bg-[var(--surface-alt)] p-6 text-sm text-[var(--ink-2)] shadow-2xl shadow-black/30"
          >
            <h3 className="text-lg font-semibold text-[var(--ink)]">Methodology</h3>
            <p className="mt-3 leading-relaxed">
              Metrics reflect experimentation results, analytics coverage, and technical delivery tracked in shared program dashboards.
              Timeseries normalize to starting index for clarity; confidence annotations follow experimentation readouts.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex rounded-full border border-[color-mix(in_srgb,var(--ink)_12%,transparent)] px-3 py-1.5 text-sm font-medium text-[var(--ink)] hover:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
