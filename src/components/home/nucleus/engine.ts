import { slideModules } from './slides';
import type { SlideData, SlideModule } from './types';

const grad3 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [-1, 1], [1, -1], [-1, -1]
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
  if (q > 0) { q *= q; n0 = q * q * dot(grad3[gi0], x0, y0); }
  q = 0.5 - x1 * x1 - y1 * y1;
  if (q > 0) { q *= q; n1 = q * q * dot(grad3[gi1], x1, y1); }
  q = 0.5 - x2 * x2 - y2 * y2;
  if (q > 0) { q *= q; n2 = q * q * dot(grad3[gi2], x2, y2); }
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

const AUTO_ADVANCE_INTERVAL = 30000;
const IDLE_TIMEOUT = 5000;

type ActiveSlide = { module: SlideModule; data: SlideData };
const modeDisplay: Record<string, { icon: string; name: string; href: string }> = {
  listening: { icon: '♫', name: 'LISTENING', href: '/music' },
  watching: { icon: '▶', name: 'WATCHING', href: '/watching' },
  reading: { icon: '◉', name: 'READING', href: '/writing' },
  travel: { icon: '✈', name: 'TRAVEL', href: '/travel' },
  cycling: { icon: '◎', name: 'CYCLING', href: '/cycling' },
  writing: { icon: '✎', name: 'WRITING', href: '/writing' },
  biometrics: { icon: '♡', name: 'BIOMETRICS', href: '/biometrics' }
};

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const tickerLabelPrefix = (value: unknown): string => `<span class="ticker-item ticker-item--label ticker-label">${escapeHtml(value)}</span>`;
const tickerText = (value: unknown): string => `<span class="ticker-item ticker-item--text ticker-text">${escapeHtml(value)}</span>`;
const tickerNumber = (value: unknown, unit?: string): string => `<span class="ticker-item ticker-item--numeric"><span class="ticker-val">${escapeHtml(value)}</span>${unit ? `<span class="ticker-unit">${escapeHtml(unit)}</span>` : ''}</span>`;
const tickerChip = (value: unknown): string => `<span class="ticker-item ticker-item--chip ticker-chip">${escapeHtml(value)}</span>`;

const subTickerItems = (slide: ActiveSlide): string[] => {
  const { module } = slide;

  if (module.id === 'biometrics') {
    return [
      tickerLabelPrefix('LAST NIGHT'),
      tickerText('FEB 22'),
      tickerLabelPrefix('DEEP'),
      tickerNumber('1h 42m'),
      tickerLabelPrefix('REM'),
      tickerNumber('2h 15m'),
      tickerLabelPrefix('STEPS'),
      tickerNumber('8,423'),
      tickerLabelPrefix('7D AVG HRV'),
      tickerNumber('47', 'ms')
    ];
  }

  if (module.id === 'cycling') {
    return [
      tickerLabelPrefix('LAST RIDE'),
      tickerText('FEB 20'),
      tickerLabelPrefix('THIS MONTH'),
      tickerNumber('127', 'mi'),
      tickerLabelPrefix('LONGEST'),
      tickerNumber('34', 'mi'),
      tickerLabelPrefix('YTD ELEV'),
      tickerNumber('2,400', 'ft'),
      tickerLabelPrefix('AVG SPEED'),
      tickerNumber('9.7', 'mph')
    ];
  }

  if (module.id === 'listening') {
    return [
      tickerLabelPrefix('THIS WEEK'),
      tickerNumber('847', 'scrobbles'),
      tickerLabelPrefix('TOP ARTIST'),
      tickerText('Cocteau Twins'),
      tickerLabelPrefix('TOP GENRE'),
      tickerText('Dream Pop'),
      tickerChip('12 DAY STREAK')
    ];
  }

  if (module.id === 'watching') {
    return [
      tickerLabelPrefix('2026 TOTAL'),
      tickerNumber('23', 'films'),
      tickerChip('AVG ★ 3.8'),
      tickerLabelPrefix('LAST LOGGED'),
      tickerText('FEB 21'),
      tickerLabelPrefix('TOP DECADE'),
      tickerText('1970s')
    ];
  }

  if (module.id === 'writing') {
    return [
      tickerNumber('12', 'posts in 2026'),
      tickerNumber('14,200', 'total words'),
      tickerLabelPrefix('MOST TAGGED'),
      tickerText('CRO'),
      tickerLabelPrefix('LAST PUBLISHED'),
      tickerText('FEB 18')
    ];
  }

  if (module.id === 'travel') {
    return [
      tickerNumber('23', 'countries'),
      tickerNumber('6', 'continents'),
      tickerNumber('142,000', 'mi flown'),
      tickerLabelPrefix('LAST TRIP'),
      tickerText('London'),
      tickerLabelPrefix('AIRPORTS'),
      tickerNumber('47')
    ];
  }

  if (module.id === 'reading') {
    return [
      tickerLabelPrefix('CURRENT'),
      tickerText('Systems Thinking'),
      tickerLabelPrefix('PAGES THIS WEEK'),
      tickerNumber('214'),
      tickerChip('6 DAY STREAK')
    ];
  }

  return [tickerText('NO DATA CACHED')];
};

const renderSlide = (slide: ActiveSlide, ctx: CanvasRenderingContext2D, width: number, height: number, frame: number) => {
  const theme = getThemeColors();
  slide.module.render(ctx, width, height, frame, slide.data, theme);
};

const pickStartingSlide = (slides: ActiveSlide[]): number => {
  if (slides.length <= 1) return 0;
  const ranked = slides.map((s, i) => ({ index: i, time: new Date(s.data.updatedAt).getTime() || 0 })).sort((a, b) => b.time - a.time);
  const primaryWeights = [0.40, 0.25, 0.15];
  const remainingCount = Math.max(1, ranked.length - 3);
  const weights = ranked.map((_, i) => (i < 3 ? primaryWeights[i] : 0.20 / remainingCount));
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

  const nucleus = document.getElementById('nucleus');
  const tickerLabel = document.querySelector<HTMLAnchorElement>('.nucleus-ticker__mode-label');
  const tickerIcon = document.querySelector<HTMLElement>('.nucleus-ticker__mode-icon');
  const tickerName = document.querySelector<HTMLElement>('.nucleus-ticker__mode-name');
  const tickerRoot = document.getElementById('nucleus-ticker');
  const tickerScroll = document.getElementById('nucleus-ticker-scroll');
  const prevBtn = document.getElementById('nucleus-prev');
  const nextBtn = document.getElementById('nucleus-next');

  if (!nucleus) return;
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
    slides = [{
      module: slideModules[0],
      data: { label: 'NUCLEUS', detail: 'No slide data available', link: '#', updatedAt: new Date().toISOString(), renderData: {} }
    }];
  }

  let frame = 0;
  let currentSlide = pickStartingSlide(slides);
  let transitioning = false;
  let autoAdvanceTimer: ReturnType<typeof setInterval> | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const getDimensions = () => ({ width: canvas.width / (window.devicePixelRatio || 1), height: canvas.height / (window.devicePixelRatio || 1) });
  const setState = (newState: 'ambient' | 'scanning' | 'exploring') => { nucleus.setAttribute('data-state', newState); };

  const updateSubTicker = (slide: ActiveSlide) => {
    if (!tickerScroll || !tickerLabel || !tickerIcon || !tickerName) return;
    const mode = modeDisplay[slide.module.id] ?? { icon: '◌', name: slide.data.label, href: slide.data.link };
    tickerIcon.textContent = mode.icon;
    tickerName.textContent = mode.name;
    tickerLabel.href = mode.href;

    const items = subTickerItems(slide);
    const source = items.length ? items : [tickerText('NO DATA CACHED')];
    const segment = source.map((item, i) => {
      const sep = i < source.length - 1 ? '<span class="ticker-sep" aria-hidden="true">·</span>' : '';
      return `${item}${sep}`;
    }).join('');

    tickerScroll.classList.remove('is-animated');
    tickerScroll.style.removeProperty('--scroll-duration');
    tickerScroll.innerHTML = segment;

    const stream = tickerScroll.parentElement;
    if (!reducedMotion && stream instanceof HTMLElement) {
      const contentWidth = tickerScroll.scrollWidth;
      if (contentWidth > stream.clientWidth) {
        const copy = `<span class="ticker-copy">${segment}<span class="ticker-sep" aria-hidden="true">·</span></span>`;
        tickerScroll.innerHTML = `${copy}${copy}`;
        tickerScroll.classList.add('is-animated');
        const duration = Math.max(30, Math.min(40, contentWidth / 22));
        tickerScroll.style.setProperty('--scroll-duration', `${duration}s`);
      }
    }

    if (reducedMotion) {
      tickerScroll.classList.remove('entering');
      return;
    }

    tickerScroll.classList.remove('entering');
    void tickerScroll.offsetWidth;
    tickerScroll.classList.add('entering');
    window.setTimeout(() => tickerScroll.classList.remove('entering'), 400);
  };

  const applySlideState = (index: number) => {
    currentSlide = index;
    slides[currentSlide].module.reset?.();
    updateSubTicker(slides[currentSlide]);
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
      if (clamped < midpoint) renderSlide(fromSlide, ctx, width, height, frame);
      else renderSlide(toSlide, ctx, width, height, frame);

      const { accent } = getThemeColors();
      const scanY = height * (clamped / duration);
      const scanAlpha = clamped < midpoint ? 0.3 : Math.max(0, 0.3 * (1 - (clamped - midpoint) / midpoint));
      ctx.fillStyle = accent;
      ctx.globalAlpha = scanAlpha;
      ctx.fillRect(0, scanY, width, 2 + Math.floor(Math.random() * 2));

      const noiseFade = clamped < midpoint ? 1 : Math.max(0, 1 - (clamped - midpoint) / midpoint);
      const grainCount = 200 + Math.floor(Math.random() * 201);
      for (let i = 0; i < grainCount; i++) {
        ctx.globalAlpha = (0.05 + Math.random() * 0.03) * noiseFade;
        ctx.fillRect(Math.random() * width, Math.random() * height, 1 + Math.floor(Math.random() * 2), 1 + Math.floor(Math.random() * 2));
      }
      ctx.globalAlpha = 1;

      if (elapsed < duration) return requestAnimationFrame(tick);
      callback();
      transitioning = false;
    };

    requestAnimationFrame(tick);
  };

  const transitionToSlide = (nextIndex: number) => {
    if (nextIndex === currentSlide) return;
    if (reducedMotion) {
      applySlideState(nextIndex);
      return;
    }
    crtTransition(nextIndex, () => applySlideState(nextIndex));
  };

  const startAutoAdvance = () => {
    if (autoAdvanceTimer) clearInterval(autoAdvanceTimer);
    autoAdvanceTimer = setInterval(() => {
      if (transitioning) return;
      transitionToSlide((currentSlide + 1) % slides.length);
    }, AUTO_ADVANCE_INTERVAL);
  };

  const stopAutoAdvance = () => {
    if (autoAdvanceTimer) clearInterval(autoAdvanceTimer);
    autoAdvanceTimer = null;
  };

  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      setState('ambient');
      startAutoAdvance();
    }, IDLE_TIMEOUT);
  };

  const goRelative = (delta: number) => {
    const next = (currentSlide + delta + slides.length) % slides.length;
    stopAutoAdvance();
    setState('exploring');
    transitionToSlide(next);
    resetIdleTimer();
  };

  prevBtn?.addEventListener('click', () => goRelative(-1));
  nextBtn?.addEventListener('click', () => goRelative(1));

  const pause = () => stopAutoAdvance();
  const resume = () => startAutoAdvance();

  nucleus.addEventListener('mouseenter', pause);
  nucleus.addEventListener('mouseleave', resume);
  tickerRoot?.addEventListener('mouseenter', pause);
  tickerRoot?.addEventListener('mouseleave', resume);

  document.addEventListener('keydown', (e) => {
    const rect = nucleus.getBoundingClientRect();
    const inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (!inView) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goRelative(1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goRelative(-1); }

  });

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

    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      goRelative(dx < 0 ? 1 : -1);
    }
  });

  setState('ambient');
  applySlideState(currentSlide);
  const { width, height } = getDimensions();
  renderSlide(slides[currentSlide], ctx, width, height, frame);
  startAutoAdvance();

  window.addEventListener('resize', () => resizeCanvas(canvas, ctx));

  const animate = () => {
    frame += 1;
    if (!transitioning) {
      const dims = getDimensions();
      renderSlide(slides[currentSlide], ctx, dims.width, dims.height, frame);
    }
    requestAnimationFrame(animate);
  };

  animate();
};
