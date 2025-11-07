import { useEffect } from "react";

const openAll = (container: HTMLElement) => {
  const details = container.querySelectorAll<HTMLDetailsElement>("details");
  details.forEach((detail) => {
    detail.open = true;
    detail.setAttribute("data-print-open", "true");
  });
  if (details.length > 0) {
    details[0].querySelector<HTMLElement>("summary")?.focus();
  }
};

export default function ExperienceTimelineClient({ buttonId, containerId }: { buttonId: string; containerId: string }) {
  useEffect(() => {
    const button = document.getElementById(buttonId);
    const container = document.getElementById(containerId);
    if (!button || !container) return;

    const onClick = () => {
      openAll(container);
    };
    button.addEventListener("click", onClick);

    const beforePrint = () => openAll(container);
    window.addEventListener("beforeprint", beforePrint);

    return () => {
      button.removeEventListener("click", onClick);
      window.removeEventListener("beforeprint", beforePrint);
    };
  }, [buttonId, containerId]);

  return null;
}
