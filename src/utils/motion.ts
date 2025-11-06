export const durations = { fast: 0.12, medium: 0.2, slow: 0.32 };
export const easing = "cubic-bezier(.2,.8,.2,1)";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const onceVisible = (
  elements: Element[] | NodeListOf<Element>,
  callback: (el: Element) => void,
  threshold = 0.4
) => {
  const items = Array.from(elements);
  if (!items.length) return;
  if (prefersReducedMotion()) {
    items.forEach((el) => callback(el));
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
  items.forEach((el) => observer.observe(el));
};

export const toggleByVisibility = (
  element: Element | null,
  target: Element | null,
  threshold = 0.5,
  hiddenClass = "is-hidden"
) => {
  if (!element || !target) return;
  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry) return;
      if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
        target.classList.add(hiddenClass);
      } else {
        target.classList.remove(hiddenClass);
      }
    },
    { threshold: Array.isArray(threshold) ? threshold : [threshold, 0] }
  );
  observer.observe(element);
  return observer;
};
