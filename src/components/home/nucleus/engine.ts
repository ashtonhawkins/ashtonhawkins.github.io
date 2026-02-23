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

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
const SLIDE_DURATION = 9000;

const scrambleText = (
  element: HTMLElement | null,
  targetText: string,
  duration: number,
  delay = 0,
  decode = true
) => {
  if (!(element instanceof HTMLElement)) return;
  const startText = element.textContent || '';
  const length = Math.max(startText.length, targetText.length);
  const stagger = 18;
  const startTime = performance.now() + delay;

  const update = () => {
    const elapsed = performance.now() - startTime;
    if (elapsed < 0) {
      requestAnimationFrame(update);
      return;
    }

    const progress = Math.min(elapsed / duration, 1);
    const resolvedCount = decode ? Math.min(targetText.length, Math.floor(elapsed / stagger)) : 0;
    let output = '';

    for (let i = 0; i < length; i++) {
      if (decode && i < resolvedCount && i < targetText.length) {
        output += targetText[i];
      } else {
        output += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }
    }

    element.textContent = output.slice(0, decode ? Math.max(resolvedCount, targetText.length) : length);

    if (progress < 1) {
      requestAnimationFrame(update);
    } else if (decode) {
      element.textContent = targetText;
    }
  };

  requestAnimationFrame(update);
};

type ActiveSlide = { module: SlideModule; data: SlideData };

const createTrack = (slides: ActiveSlide[]) => {
  const segmentsHost = document.getElementById('nucleus-track-segments');
  if (!(segmentsHost instanceof HTMLElement)) return;
  segmentsHost.innerHTML = '';

  document.documentElement.style.setProperty('--slide-duration', `${SLIDE_DURATION}ms`);

  slides.forEach((slide) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nucleus-track__segment';
    button.dataset.mode = slide.module.id;
    button.setAttribute('aria-label', slide.data.label);
    button.setAttribute('aria-current', 'false');

    const fill = document.createElement('span');
    fill.className = 'nucleus-track__fill';
    button.appendChild(fill);

    segmentsHost.append(button);
  });
};

const updateTrack = (mode: string) => {
  const segments = document.querySelectorAll('.nucleus-track__segment');
  const label = document.querySelector('.nucleus-track__label');

  segments.forEach((seg) => {
    const isActive = (seg as HTMLElement).dataset.mode === mode;
    seg.setAttribute('aria-current', isActive ? 'true' : 'false');

    if (isActive) {
      const fill = seg.querySelector('.nucleus-track__fill');
      if (fill instanceof HTMLElement) {
        fill.style.animation = 'none';
        void fill.offsetWidth;
        fill.style.animation = '';
      }
    }
  });

  if (label) {
    label.textContent = mode.toUpperCase();
  }
};

const resetProgress = () => {
  const bar = document.getElementById('nucleus-progress');
  if (!bar) return;
  bar.classList.remove('nucleus__progress--filling');
  bar.style.opacity = '0';
  void bar.getBoundingClientRect();
  bar.classList.add('nucleus__progress--filling');
};

const startCaptionTransition = (slide: ActiveSlide, reducedMotion: boolean) => {
  const labelEl = document.getElementById('nucleus-label');
  const detailEl = document.getElementById('nucleus-detail');
  const linkEl = document.getElementById('nucleus-link');

  if (reducedMotion) {
    if (labelEl) labelEl.textContent = slide.data.label;
    if (detailEl) detailEl.textContent = slide.data.detail;
    if (linkEl instanceof HTMLAnchorElement) linkEl.href = slide.data.link;
    return;
  }

  const scrambleDuration = 250;
  scrambleText(labelEl, labelEl?.textContent || '', scrambleDuration, 0, false);
  scrambleText(detailEl, detailEl?.textContent || '', scrambleDuration, 0, false);

  window.setTimeout(() => {
    if (linkEl instanceof HTMLAnchorElement) linkEl.href = slide.data.link;
    scrambleText(labelEl, slide.data.label, 250, 0, true);
    scrambleText(detailEl, slide.data.detail, 250, 0, true);
  }, scrambleDuration);
};

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

export const initNucleus = async () => {
  const canvas = document.getElementById('nucleus-canvas');
  const ctx = canvas instanceof HTMLCanvasElement ? canvas.getContext('2d') : null;

  if (!(canvas instanceof HTMLCanvasElement) || !(ctx instanceof CanvasRenderingContext2D)) return;

  resizeCanvas(canvas, ctx);

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

  createTrack(slides);

  let frame = 0;
  let currentSlide = pickStartingSlide(slides);
  let transitioning = false;
  let lastSwitch = Date.now();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const getDimensions = () => ({
    width: canvas.width / (window.devicePixelRatio || 1),
    height: canvas.height / (window.devicePixelRatio || 1)
  });

  const applySlideState = (index: number) => {
    currentSlide = index;
    slides[currentSlide].module.reset?.();
    updateTrack(slides[currentSlide].module.id);
    resetProgress();
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
    const nextSlide = slides[nextIndex];
    startCaptionTransition(nextSlide, reducedMotion);

    if (reducedMotion) {
      applySlideState(nextIndex);
      return;
    }

    crtTransition(nextIndex, () => {
      applySlideState(nextIndex);
    });
  };

  const bindTrack = () => {
    document.querySelectorAll('.nucleus-track__segment').forEach((seg) => {
      seg.addEventListener('click', () => {
        const mode = (seg as HTMLElement).dataset.mode;
        const index = slides.findIndex((s) => s.module.id === mode);
        if (index >= 0 && index !== currentSlide && !transitioning) {
          lastSwitch = Date.now();
          resetProgress();
          transitionToSlide(index);
        }
      });
    });
  };

  const { width, height } = getDimensions();
  renderSlide(slides[currentSlide], ctx, width, height, frame);
  slides[currentSlide].module.reset?.();
  updateTrack(slides[currentSlide].module.id);
  resetProgress();
  bindTrack();

  // Set initial caption to match the starting slide
  const labelEl = document.getElementById('nucleus-label');
  const detailEl = document.getElementById('nucleus-detail');
  const linkEl = document.getElementById('nucleus-link');
  if (labelEl) labelEl.textContent = slides[currentSlide].data.label;
  if (detailEl) detailEl.textContent = slides[currentSlide].data.detail;
  if (linkEl instanceof HTMLAnchorElement) linkEl.href = slides[currentSlide].data.link;

  window.addEventListener('resize', () => resizeCanvas(canvas, ctx));

  const animate = () => {
    frame += 1;
    if (!transitioning) {
      const now = Date.now();
      if (now - lastSwitch > SLIDE_DURATION) {
        lastSwitch = now;
        const next = (currentSlide + 1) % slides.length;
        transitionToSlide(next);
      }

      const current = slides[currentSlide];
      const dims = getDimensions();
      renderSlide(current, ctx, dims.width, dims.height, frame);
    }

    requestAnimationFrame(animate);
  };

  animate();
};
