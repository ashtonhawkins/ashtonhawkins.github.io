import { useEffect, useRef, useState } from "react";
import type resumeData from "../../data/resume.json";
import { ToastController } from "../ui/Toast";

type ResumeData = typeof resumeData;

const actions = [
  { key: "email", label: "Email", href: "mailto:hello@ashtonhawkins.com" },
  { key: "pdf", label: "Download PDF", href: "/resume.pdf" }
] as const;

const formatTxt = (data: ResumeData) => {
  const lines: string[] = [];
  lines.push(data.hero.headline);
  lines.push(data.hero.subhead);
  lines.push("");
  lines.push("KPIs:");
  data.kpis.forEach((kpi) => {
    lines.push(`- ${kpi.label}: ${kpi.value}`);
  });
  lines.push("");
  lines.push("Experience:");
  data.experience.forEach((exp) => {
    lines.push(`- ${exp.org_public} (${exp.role_public})`);
  });
  return lines.join("\n");
};

const downloadBlob = (content: string, type: string, filename: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function ActionDockButton({ data, bio }: { data: ResumeData; bio: string }) {
  const [visible, setVisible] = useState(false);
  const [isDesktop, setDesktop] = useState(false);
  const toastRef = useRef<ToastController | null>(null);

  useEffect(() => {
    const controller = new ToastController();
    toastRef.current = controller;
    return () => controller.destroy();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const sentinel = document.getElementById("hero-sentinel");
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setVisible(entry.intersectionRatio < 0.5);
        });
      },
      { threshold: [0, 0.5, 1] }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const copyBio = async () => {
    try {
      await navigator.clipboard.writeText(bio);
      toastRef.current?.show("Short bio copied");
    } catch (error) {
      toastRef.current?.show("Clipboard unavailable");
    }
  };

  const exportJson = () => {
    downloadBlob(JSON.stringify(data, null, 2), "application/json", "resume.json");
  };

  const exportTxt = () => {
    downloadBlob(formatTxt(data), "text/plain", "resume.txt");
  };

  return (
    <div
      className={`${
        isDesktop
          ? "pointer-events-none lg:absolute lg:top-0 lg:right-0"
          : "pointer-events-none"
      } ${visible ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
    >
      <div
        className={`${
          isDesktop
            ? "pointer-events-auto rounded-2xl bg-[var(--surface-alt)] p-4 shadow-xl shadow-black/10 ring-1 ring-[color-mix(in_srgb,var(--ink)_12%,transparent)]"
            : "pointer-events-auto fixed inset-x-4 bottom-6 flex justify-center"
        }`}
      >
        <div
          className={`${
            isDesktop
              ? "flex flex-col gap-3"
              : "inline-flex items-center gap-2 rounded-full bg-[var(--surface-alt)] px-4 py-3 shadow-xl shadow-black/15 ring-1 ring-[color-mix(in_srgb,var(--ink)_12%,transparent)]"
          }`}
        >
          {actions.map((action) => (
            <a
              key={action.key}
              href={action.href}
              className={`${
                isDesktop
                  ? "flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] px-3 py-2 text-sm font-medium text-[var(--ink)] transition hover:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
                  : "flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] px-3 py-2 text-sm font-medium text-[var(--ink)]"
              }`}
            >
              {action.label}
            </a>
          ))}
          <button
            type="button"
            onClick={copyBio}
            className={`${
              isDesktop
                ? "flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] px-3 py-2 text-sm font-medium text-[var(--ink)] hover:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
                : "flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] px-3 py-2 text-sm font-medium text-[var(--ink)]"
            }`}
          >
            Copy bio
          </button>
          <button
            type="button"
            onClick={exportJson}
            className={`${
              isDesktop
                ? "flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] px-3 py-2 text-sm font-medium text-[var(--ink)] hover:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
                : "flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] px-3 py-2 text-sm font-medium text-[var(--ink)]"
            }`}
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={exportTxt}
            className={`${
              isDesktop
                ? "flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] px-3 py-2 text-sm font-medium text-[var(--ink)] hover:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
                : "flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] px-3 py-2 text-sm font-medium text-[var(--ink)]"
            }`}
          >
            Export TXT
          </button>
        </div>
      </div>
    </div>
  );
}
