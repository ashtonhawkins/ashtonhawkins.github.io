export const durations = { fast: 0.12, medium: 0.2, slow: 0.32 } as const;
export const easing = "cubic-bezier(.2,.8,.2,1)";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Observable = Element | Element[] | NodeListOf<Element>;

const toArray = (elements: Observable) => (Array.isArray(elements) ? elements : Array.from(elements));

export const onceVisible = (elements: Observable, callback: (el: Element) => void, threshold = 0.5) => {
  const nodes = toArray(elements);
  if (!nodes.length) return;
  if (prefersReducedMotion()) {
    nodes.forEach((node) => callback(node));
    return;
  }
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          callback(entry.target);
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold }
  );
  nodes.forEach((node) => observer.observe(node));
};

export const bindVisibilityState = (anchor: Element | null, target: Element | null, threshold = 0.5) => {
  if (!anchor || !target) return;
  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry) return;
      const state = entry.isIntersecting && entry.intersectionRatio > threshold ? "hidden" : "visible";
      target.setAttribute("data-state", state);
    },
    { threshold: [0, threshold, 1] }
  );
  observer.observe(anchor);
};

type CounterOptions = {
  duration?: number;
  formatter?: (value: number) => string;
};

export const animateCounter = (node: HTMLElement, finalValue: number, { duration = durations.slow, formatter }: CounterOptions = {}) => {
  if (prefersReducedMotion()) {
    node.textContent = formatter ? formatter(finalValue) : `${finalValue}`;
    return;
  }
  const initial = Number(node.dataset.start ?? finalValue * 0.6);
  const startValue = Number.isFinite(initial) ? initial : 0;
  const startTime = performance.now();
  const total = Math.max(duration * 1000, 80);

  const format = formatter ?? ((value: number) => `${value}`);

  const tick = (timestamp: number) => {
    const elapsed = timestamp - startTime;
    const progress = Math.min(1, elapsed / total);
    const eased = progress < 1 ? 1 - Math.pow(1 - progress, 3) : 1;
    const current = startValue + (finalValue - startValue) * eased;
    node.textContent = format(current);
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      node.textContent = format(finalValue);
    }
  };

  requestAnimationFrame(tick);
};
