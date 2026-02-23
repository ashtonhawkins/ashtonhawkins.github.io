import { slideModules } from './slides';
import type { SlideData, SlideModule } from './types';

const grad3 = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1]
];
const permutation = Array.from({ length: 256 }, (_, i) => i);
for (let i = 255; i > 0; i--) {
  const r = Math.floor(Math.random() * (i + 1));
  [permutation[i], permutation[r]] = [permutation[r], permutation[i]];
}
const perm = Array.from({ length: 512 }, (_, i) => permutation[i & 255]);

const dot = (g: number[], x: number, y: number) => g[0] * x + g[1] * y;

export const simplex2D = (xin: number, yin: number): number => {
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  const s = (xin + yin) * F2;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const t = (i + j) * G2;
  const X0 = i - t;
  const Y0 = j - t;
  const x0 = xin - X0;
  const y0 = yin - Y0;
  const i1 = x0 > y0 ? 1 : 0;
  const j1 = x0 > y0 ? 0 : 1;
  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;
  const ii = i & 255;
  const jj = j & 255;
  const gi0 = perm[ii + perm[jj]] % 12;
  const gi1 = perm[ii + i1 + perm[jj + j1]] % 12;
  const gi2 = perm[ii + 1 + perm[jj + 1]] % 12;
  let n0 = 0;
  let n1 = 0;
  let n2 = 0;
  let q = 0.5 - x0 * x0 - y0 * y0;
  if (q > 0) {
    q *= q;
    n0 = q * q * dot(grad3[gi0], x0, y0);
  }
  q = 0.5 - x1 * x1 - y1 * y1;
  if (q > 0) {
    q *= q;
    n1 = q * q * dot(grad3[gi1], x1, y1);
  }
  q = 0.5 - x2 * x2 - y2 * y2;
  if (q > 0) {
    q *= q;
    n2 = q * q * dot(grad3[gi2], x2, y2);
  }
  return 70 * (n0 + n1 + n2);
};

export const getThemeColors = () => {
  const style = getComputedStyle(document.documentElement);
  return {
    accent: style.getPropertyValue('--accent-primary').trim(),
    border: style.getPropertyValue('--border').trim()
  };
};

export const resizeCanvas = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
  const parent = canvas.parentElement;
  if (!parent) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = parent.clientWidth * dpr;
  canvas.height = parent.clientHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};

/* ══════════════════════════════════════
   Constants
   ══════════════════════════════════════ */

const AUTO_ADVANCE_INTERVAL = 30000; // 30s per mode
const IDLE_TIMEOUT = 5000; // 5s no movement → resume auto

type ActiveSlide = { module: SlideModule; data: SlideData };
type NucleusState = 'ambient' | 'scanning' | 'exploring' | 'focused';

/* ══════════════════════════════════════
   Edge Metadata
   ══════════════════════════════════════ */

const updateMeta = (slide: ActiveSlide, index: number, total: number) => {
  const meta = document.getElementById('nucleus-meta');
  if (!meta) return;

  const labelEl = meta.querySelector<HTMLElement>('[data-field="label"]');
  const statEl = meta.querySelector<HTMLElement>('[data-field="stat"]');
  const posEl = meta.querySelector<HTMLElement>('[data-field="position"]');
  const linkEl = meta.querySelector<HTMLAnchorElement>('[data-field="link"]');

  if (labelEl) labelEl.textContent = slide.data.label;
  if (statEl) statEl.textContent = slide.data.detail;
  if (posEl) posEl.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
  if (linkEl) {
    linkEl.href = slide.data.link;
    linkEl.textContent = 'EXPLORE \u2192';
  }
};

/* ══════════════════════════════════════
   Rendering
   ══════════════════════════════════════ */

const renderSlide = (
  slide: ActiveSlide,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number
) => {
  const theme = getThemeColors();
  slide.module.render(ctx, width, height, frame, slide.data, theme);
};

const pickStartingSlide = (slides: ActiveSlide[]): number => {
  if (slides.length <= 1) return 0;

  const ranked = slides
    .map((s, i) => ({ index: i, time: new Date(s.data.updatedAt).getTime() || 0 }))
    .sort((a, b) => b.time - a.time);

  const primaryWeights = [0.40, 0.25, 0.15];
  const remainingCount = Math.max(1, ranked.length - 3);
  const weights = ranked.map((_, i) =>
    i < 3 ? primaryWeights[i] : 0.20 / remainingCount
  );

  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < ranked.length; i++) {
    cumulative += weights[i];
    if (rand <= cumulative) return ranked[i].index;
  }
  return ranked[0].index;
};

/* ══════════════════════════════════════
   Init
   ══════════════════════════════════════ */

export const initNucleus = async () => {
  const canvas = document.getElementById('nucleus-canvas');
  const ctx = canvas instanceof HTMLCanvasElement ? canvas.getContext('2d') : null;

  if (!(canvas instanceof HTMLCanvasElement) || !(ctx instanceof CanvasRenderingContext2D)) return;

  const nucleus = document.getElementById('nucleus');
  if (!nucleus) return;

  resizeCanvas(canvas, ctx);

  /* ── Fetch slide data ── */

  const fetched = await Promise.all(
    slideModules.map(async (module) => {
      try {
        const data = await module.fetchData();
        if (!data) return null;
        return { module, data } as ActiveSlide;
      } catch {
        return null;
      }
    })
  );

  let slides = fetched.filter((slide): slide is ActiveSlide => slide !== null);
  if (slides.length === 0) {
    slides = [
      {
        module: slideModules[0],
        data: {
          label: 'NUCLEUS',
          detail: 'No slide data available',
          link: '#',
          updatedAt: new Date().toISOString(),
          renderData: {}
        }
      }
    ];
  }

  /* ── Create scanbeam element ── */

  const scanbeam = document.createElement('div');
  scanbeam.className = 'nucleus__scanbeam';
  nucleus.appendChild(scanbeam);

  /* ── State ── */

  let frame = 0;
  let currentSlide = pickStartingSlide(slides);
  let transitioning = false;
  let lastSwitch = Date.now();
  let currentState: NucleusState = 'ambient';
  let autoAdvanceTimer: ReturnType<typeof setInterval> | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let cursorX = 0;
  let cursorY = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const getDimensions = () => ({
    width: canvas.width / (window.devicePixelRatio || 1),
    height: canvas.height / (window.devicePixelRatio || 1)
  });

  /* ── State management ── */

  const setState = (newState: NucleusState) => {
    currentState = newState;
    nucleus.setAttribute('data-state', newState);
  };

  const setSlide = (index: number) => {
    currentSlide = index;
    updateMeta(slides[currentSlide], currentSlide, slides.length);
  };

  /* ── Auto-advance ── */

  const startAutoAdvance = () => {
    stopAutoAdvance();
    autoAdvanceTimer = setInterval(() => {
      if (transitioning) return;
      const nextIndex = (currentSlide + 1) % slides.length;
      transitionToSlide(nextIndex);
    }, AUTO_ADVANCE_INTERVAL);
  };

  const stopAutoAdvance = () => {
    if (autoAdvanceTimer) {
      clearInterval(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }
  };

  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      // No movement for 5s — resume ambient
      setState('ambient');
      startAutoAdvance();
    }, IDLE_TIMEOUT);
  };

  /* ── CRT Transition ── */

  const applySlideState = (index: number) => {
    currentSlide = index;
    slides[currentSlide].module.reset?.();
  };

  const crtTransition = (nextIndex: number, callback: () => void) => {
    transitioning = true;
    const start = performance.now();
    const duration = 500;
    const midpoint = 250;
    const fromSlide = slides[currentSlide];
    const toSlide = slides[nextIndex];

    const tick = (now: number) => {
      const elapsed = now - start;
      const clamped = Math.min(elapsed, duration);
      const { width, height } = getDimensions();

      if (clamped < midpoint) {
        renderSlide(fromSlide, ctx, width, height, frame);
      } else {
        renderSlide(toSlide, ctx, width, height, frame);
      }

      const { accent } = getThemeColors();
      const scanProgress = clamped / duration;
      const scanY = height * scanProgress;
      const scanAlpha =
        clamped < midpoint ? 0.3 : Math.max(0, 0.3 * (1 - (clamped - midpoint) / midpoint));
      const scanHeight = 2 + Math.floor(Math.random() * 2);
      ctx.fillStyle = accent;
      ctx.globalAlpha = scanAlpha;
      ctx.fillRect(0, scanY, width, scanHeight);

      const noiseFade = clamped < midpoint ? 1 : Math.max(0, 1 - (clamped - midpoint) / midpoint);
      const grainCount = 200 + Math.floor(Math.random() * 201);
      for (let i = 0; i < grainCount; i++) {
        const grainX = Math.random() * width;
        const grainY = Math.random() * height;
        const size = 1 + Math.floor(Math.random() * 2);
        ctx.globalAlpha = (0.05 + Math.random() * 0.03) * noiseFade;
        ctx.fillRect(grainX, grainY, size, size);
      }

      ctx.globalAlpha = 1;

      if (elapsed < duration) {
        requestAnimationFrame(tick);
        return;
      }

      callback();
      transitioning = false;
    };

    requestAnimationFrame(tick);
  };

  const transitionToSlide = (nextIndex: number) => {
    if (nextIndex === currentSlide) return;
    const nextSlide = slides[nextIndex];
    updateMeta(nextSlide, nextIndex, slides.length);

    if (reducedMotion) {
      applySlideState(nextIndex);
      return;
    }

    crtTransition(nextIndex, () => {
      applySlideState(nextIndex);
    });
  };

  /* ══════════════════════════════════════
     Mouse interactions
     ══════════════════════════════════════ */

  // Mouse enter: pause auto-advance, enter scanning state
  nucleus.addEventListener('mouseenter', () => {
    stopAutoAdvance();
    setState('scanning');
    resetIdleTimer();
  });

  // Mouse leave: return to ambient (unless focused)
  nucleus.addEventListener('mouseleave', () => {
    if (currentState === 'focused') return;
    setState('ambient');
    scanbeam.style.opacity = '0';
    if (idleTimer) clearTimeout(idleTimer);
    startAutoAdvance();
  });

  // Mouse move: update scanbeam, detect hover zones
  nucleus.addEventListener('mousemove', (e) => {
    if (currentState === 'focused') return;

    const rect = nucleus.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    cursorX = x;
    cursorY = y;

    // Move scan beam
    scanbeam.style.left = x + 'px';
    scanbeam.style.top = y + 'px';

    // Determine zone (N equal vertical zones, one per slide)
    const zoneWidth = rect.width / slides.length;
    const zoneIndex = Math.min(Math.floor(x / zoneWidth), slides.length - 1);

    if (zoneIndex !== currentSlide && !transitioning) {
      setState('exploring');
      lastSwitch = Date.now();
      transitionToSlide(zoneIndex);
    } else if (currentState !== 'exploring') {
      setState('scanning');
    }

    resetIdleTimer();
  });

  // Click: toggle focus
  nucleus.addEventListener('click', (e) => {
    // Don't capture clicks on the EXPLORE link
    if ((e.target as Element)?.closest('[data-field="link"]')) return;

    if (currentState === 'focused') {
      // Unlock — return to scanning
      setState('scanning');
      resetIdleTimer();
    } else {
      // Lock focus on current mode
      setState('focused');
      stopAutoAdvance();
      if (idleTimer) clearTimeout(idleTimer);
    }
  });

  /* ══════════════════════════════════════
     Keyboard support
     ══════════════════════════════════════ */

  document.addEventListener('keydown', (e) => {
    // Only respond if nucleus is in viewport
    const rect = nucleus.getBoundingClientRect();
    const inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (!inView) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentSlide + 1) % slides.length;
      stopAutoAdvance();
      lastSwitch = Date.now();
      transitionToSlide(nextIndex);
      setState('exploring');
      resetIdleTimer();
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentSlide - 1 + slides.length) % slides.length;
      stopAutoAdvance();
      lastSwitch = Date.now();
      transitionToSlide(prevIndex);
      setState('exploring');
      resetIdleTimer();
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (currentState === 'focused') {
        setState('scanning');
        resetIdleTimer();
      } else {
        setState('focused');
        stopAutoAdvance();
        if (idleTimer) clearTimeout(idleTimer);
      }
    }

    if (e.key === 'Escape' && currentState === 'focused') {
      setState('scanning');
      resetIdleTimer();
    }
  });

  /* ══════════════════════════════════════
     Mobile: swipe + tap
     ══════════════════════════════════════ */

  let touchStartX = 0;
  let touchStartY = 0;

  nucleus.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  nucleus.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    // Detect horizontal swipe (min 50px, more horizontal than vertical)
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        // Swipe left → next
        const nextIndex = (currentSlide + 1) % slides.length;
        transitionToSlide(nextIndex);
      } else {
        // Swipe right → prev
        const prevIndex = (currentSlide - 1 + slides.length) % slides.length;
        transitionToSlide(prevIndex);
      }
      setState('exploring');
      stopAutoAdvance();
      resetIdleTimer();
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      // Tap (minimal movement) → toggle focus
      // Don't capture taps on the EXPLORE link
      if ((e.target as Element)?.closest('[data-field="link"]')) return;

      if (currentState === 'focused') {
        setState('ambient');
        startAutoAdvance();
      } else {
        setState('focused');
        stopAutoAdvance();
      }
    }
  });

  /* ══════════════════════════════════════
     Initialize & animate
     ══════════════════════════════════════ */

  setState('ambient');
  setSlide(currentSlide);
  slides[currentSlide].module.reset?.();

  const { width, height } = getDimensions();
  renderSlide(slides[currentSlide], ctx, width, height, frame);

  startAutoAdvance();

  window.addEventListener('resize', () => resizeCanvas(canvas, ctx));

  const animate = () => {
    frame += 1;
    if (!transitioning) {
      const current = slides[currentSlide];
      const dims = getDimensions();
      renderSlide(current, ctx, dims.width, dims.height, frame);
    }

    requestAnimationFrame(animate);
  };

  animate();
};
