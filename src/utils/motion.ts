const DURATION_FAST = 120;
const DURATION_MEDIUM = 200;
const DURATION_SLOW = 320;
const EASING = "cubic-bezier(.2,.8,.2,1)";

export const durations = Object.freeze({ fast: DURATION_FAST, medium: DURATION_MEDIUM, slow: DURATION_SLOW });
export const easing = EASING;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Observable = Element | Element[] | NodeListOf<Element>;

const toArray = (elements: Observable) => (Array.isArray(elements) ? elements : Array.from(elements));

export const observeVisibility = (
  elements: Observable,
  callback: (entry: IntersectionObserverEntry) => void,
  { threshold = 0.4, once = false }: { threshold?: number; once?: boolean } = {}
) => {
  const nodes = toArray(elements);
  if (!nodes.length) return;
  if (prefersReducedMotion()) {
    nodes.forEach((node) => callback({ target: node } as IntersectionObserverEntry));
    return;
  }
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          callback(entry);
          if (once) obs.unobserve(entry.target);
        }
      });
    },
    { threshold }
  );
  nodes.forEach((node) => observer.observe(node));
};

export const onceVisible = (elements: Observable, callback: (el: Element) => void, threshold = 0.4) => {
  observeVisibility(elements, (entry) => callback(entry.target), { threshold, once: true });
};

export const bindVisibilityState = (anchor: Element | null, target: Element | null, threshold = 0.5) => {
  if (!anchor || !target) return;
  if (prefersReducedMotion()) {
    target.setAttribute("data-state", "visible");
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry) return;
      const isVisible = entry.isIntersecting && entry.intersectionRatio >= threshold;
      target.setAttribute("data-state", isVisible ? "hidden" : "visible");
    },
    { threshold: [0, threshold, 1] }
  );
  observer.observe(anchor);
};

type CounterOptions = {
  duration?: number;
  formatter?: (value: number) => string;
};

export const animateCounter = (
  node: HTMLElement,
  finalValue: number,
  { duration = durations.slow, formatter }: CounterOptions = {}
) => {
  if (!Number.isFinite(finalValue)) return;
  if (prefersReducedMotion()) {
    node.textContent = formatter ? formatter(finalValue) : `${finalValue}`;
    return;
  }
  const start = performance.now();
  const total = Math.max(duration, 80);
  const initial = 0;
  const format = formatter ?? ((value: number) => `${value.toFixed(0)}`);

  const step = (timestamp: number) => {
    const elapsed = timestamp - start;
    const progress = Math.min(1, elapsed / total);
    const eased = progress < 1 ? 1 - Math.pow(1 - progress, 3) : 1;
    const current = initial + (finalValue - initial) * eased;
    node.textContent = format(current);
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      node.textContent = format(finalValue);
    }
  };

  requestAnimationFrame(step);
};
