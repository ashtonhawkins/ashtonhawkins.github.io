import Lenis from "lenis";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let lenis: Lenis | null = null;
let rafId: number | null = null;

const cancelLoop = () => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
};

const destroyLenis = () => {
  cancelLoop();
  lenis?.destroy();
  lenis = null;
};

const startLoop = () => {
  cancelLoop();
  if (!lenis) return;

  const loop = (time: number) => {
    lenis?.raf(time);
    rafId = requestAnimationFrame(loop);
  };

  rafId = requestAnimationFrame(loop);
};

const initLenis = () => {
  destroyLenis();
  if (prefersReducedMotion.matches) return;

  lenis = new Lenis({
    smoothWheel: true,
    lerp: 0.12,
    duration: 1.2
  });

  startLoop();
};

const setup = () => {
  initLenis();
};

if (document.readyState === "complete") {
  setup();
} else {
  window.addEventListener("load", setup, { once: true });
}

document.addEventListener("astro:after-swap", () => {
  setup();
});

prefersReducedMotion.addEventListener("change", (event) => {
  if (event.matches) {
    destroyLenis();
  } else {
    initLenis();
  }
});
