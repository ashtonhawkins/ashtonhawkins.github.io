import { slideModules } from './slides';
import type { SlideData, SlideModule } from './types';
import cyclingData from '@data/cycling.json';
import travelStats from '@data/travel-stats.json';
import ouraData from '@data/oura-cache.json';
import ouraActivity from '@data/oura/activity.json';

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
const modeDisplay: Record<string, { service: string; logo: string; icon: string; name: string; href: string }> = {
  listening: { service: 'Last.fm', logo: '/icons/lastfm-mono.svg', icon: '♫', name: 'LISTENING', href: '/music' },
  watching: { service: 'Letterboxd', logo: '/icons/letterboxd-mono.svg', icon: '▶', name: 'WATCHING', href: '/watching' },
  travel: { service: 'Travel', logo: '/icons/globe-mono.svg', icon: '✈', name: 'TRAVEL', href: '/travel' },
  cycling: { service: 'Strava', logo: '/icons/strava-mono.svg', icon: '◎', name: 'CYCLING', href: '/cycling' },
  writing: { service: 'Blog', logo: '/icons/pen-mono.svg', icon: '✏', name: 'WRITING', href: '/writing' },
  biometrics: { service: 'Oura', logo: '/icons/oura-mono.svg', icon: '◉', name: 'BIOMETRICS', href: '/biometrics' }
};

type TransmissionStat = { value: string; unit: string };
type TransmissionMode = { service: string; logo: string; icon: string; name: string; link: string; stats: TransmissionStat[] };

const fmtNumber = (value: number | null | undefined): string => value == null ? '0' : Number(value).toLocaleString();
const fmtDateShort = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const fmtDuration = (minutes: number | null | undefined): string | null => {
  if (minutes == null) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
};
const isPresent = (value: unknown): boolean => value != null && String(value).trim() !== '' && String(value).trim().toUpperCase() !== 'N/A';

const buildModeStats = (slide: ActiveSlide): TransmissionMode => {
  const display = modeDisplay[slide.module.id] ?? { service: slide.module.id, logo: '', icon: '◌', name: slide.data.label, href: slide.data.link };
  const renderData = (slide.data?.renderData ?? {}) as Record<string, any>;
  const feedsWatching = (window as any).__nucleusWatchingData ?? {};
  const feedsListening = (window as any).__nucleusListeningData ?? {};
  const writingStats = (window as any).__nucleusWritingStats ?? {};

  const stats: TransmissionStat[] = [];

  if (slide.module.id === 'listening') {
    if (feedsListening?.weeklyPlays != null) stats.push({ value: fmtNumber(feedsListening.weeklyPlays), unit: 'plays this week' });
    if (renderData.artist) stats.push({ value: renderData.artist, unit: 'top artist' });
    if (renderData.genre && isPresent(renderData.genre)) stats.push({ value: String(renderData.genre).replace(/\b\w/g, (c: string) => c.toUpperCase()), unit: 'top genre' });
    if (feedsListening?.streakDays != null) stats.push({ value: String(feedsListening.streakDays), unit: 'day streak' });
  }

  if (slide.module.id === 'watching') {
    const thisYear = new Date().getFullYear();
    if (feedsWatching?.thisYearCount != null) stats.push({ value: fmtNumber(feedsWatching.thisYearCount), unit: `films in ${thisYear}` });
    if (feedsWatching?.totalFilms != null) stats.push({ value: fmtNumber(feedsWatching.totalFilms), unit: 'lifetime films' });
    if (feedsWatching?.avgRating != null) stats.push({ value: `★ ${feedsWatching.avgRating}`, unit: 'average rating' });
    if (feedsWatching?.topDecade) stats.push({ value: feedsWatching.topDecade, unit: 'top decade' });
  }

  if (slide.module.id === 'writing') {
    const thisYear = new Date().getFullYear();
    if (writingStats?.thisYearPosts != null) stats.push({ value: String(writingStats.thisYearPosts), unit: `posts in ${thisYear}` });
    if (writingStats?.totalWords != null) stats.push({ value: fmtNumber(writingStats.totalWords), unit: 'words written' });
    if (writingStats?.topTag) stats.push({ value: writingStats.topTag, unit: 'top tag' });
    const lastPublished = fmtDateShort(writingStats?.lastPublished);
    if (lastPublished) stats.push({ value: lastPublished, unit: 'last published' });
  }

  if (slide.module.id === 'travel') {
    const lastTrip = (window as any).__nucleusTravelData?.lastTrip?.destination?.city;
    if (travelStats.countries != null) stats.push({ value: String(travelStats.countries), unit: 'countries visited' });
    stats.push({ value: '6', unit: 'continents' });
    if (travelStats.totalDistance != null) stats.push({ value: `${Math.round(travelStats.totalDistance / 1000)}K`, unit: 'miles flown' });
    if (lastTrip) stats.push({ value: lastTrip, unit: 'last trip' });
    if (travelStats.airports != null) stats.push({ value: String(travelStats.airports), unit: 'airports' });
  }

  if (slide.module.id === 'cycling') {
    const activities = (window as any).__nucleusCyclingActivities ?? [];
    const lastRideDate = activities[0]?.start_date;
    const avgMph = activities.length ? (activities.reduce((sum: number, a: any) => sum + ((a.average_speed || 0) * 2.23694), 0) / activities.length).toFixed(1) : null;
    const longestMi = activities.length ? Math.max(...activities.map((a: any) => (a.distance || 0) / 1609.34)).toFixed(0) : null;
    stats.push({ value: String(cyclingData.thisMonth?.miles ?? 0), unit: 'mi this month' });
    const formattedLastRide = fmtDateShort(lastRideDate);
    if (formattedLastRide) stats.push({ value: formattedLastRide, unit: 'last ride' });
    if (longestMi) stats.push({ value: longestMi, unit: 'mi longest ride' });
    if (cyclingData.thisMonth?.elevation != null) stats.push({ value: fmtNumber(cyclingData.thisMonth.elevation), unit: 'ft climbed YTD' });
    if (avgMph) stats.push({ value: avgMph, unit: 'mph average' });
  }

  if (slide.module.id === 'biometrics') {
    const ln = ouraData.lastNight;
    stats.push({ value: String(ln?.readinessScore ?? ''), unit: 'readiness score' });
    const total = fmtDuration(ln?.totalSleepMinutes);
    const deep = fmtDuration(ln?.deepMinutes);
    const rem = fmtDuration(ln?.remMinutes);
    if (total) stats.push({ value: total, unit: 'total sleep' });
    if (deep) stats.push({ value: deep, unit: 'deep sleep' });
    if (rem) stats.push({ value: rem, unit: 'REM sleep' });
    const steps = (ouraActivity as any)?.data?.[0]?.steps ?? null;
    if (steps != null) stats.push({ value: fmtNumber(steps), unit: 'steps' });
  }

  return { service: display.service, logo: display.logo, icon: display.icon, name: display.name, link: display.href, stats: stats.filter((s) => isPresent(s.value)) };
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
  const tickerRoot = document.getElementById('nucleus-ticker');

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

  class NucleusTicker {
    modes: TransmissionMode[];
    currentModeIndex = 0;
    logoEl = document.getElementById('ticker-service-logo') as HTMLImageElement | null;
    modeNameEl = document.getElementById('ticker-mode-name') as HTMLAnchorElement | null;
    modeCounterEl = document.getElementById('ticker-mode-counter');
    statsContainer = document.getElementById('ticker-stats');
    prevBtn = document.getElementById('nucleus-prev');
    nextBtn = document.getElementById('nucleus-next');

    constructor(modesData: TransmissionMode[]) {
      this.modes = modesData;
      this.bindNav();
      this.setMode(0);
    }

    setMode(index: number) {
      const mode = this.modes[index];
      if (!mode) return;
      this.currentModeIndex = index;

      if (this.logoEl) {
        this.logoEl.src = mode.logo;
        this.logoEl.alt = mode.service;
      }
      if (this.modeNameEl) {
        this.modeNameEl.textContent = mode.name;
        this.modeNameEl.href = mode.link;
      }
      if (this.modeCounterEl) {
        this.modeCounterEl.textContent = `${index + 1}/${this.modes.length}`;
      }

      this.renderStats(mode.stats);
    }

    renderStats(stats: TransmissionStat[]) {
      if (!this.statsContainer) return;
      this.statsContainer.style.opacity = '0';
      window.setTimeout(() => {
        if (!this.statsContainer) return;
        this.statsContainer.innerHTML = '';

        if (!stats || stats.length === 0) {
          const col = document.createElement('div');
          col.className = 'nucleus-ticker__stat-col';
          col.innerHTML = `
            <span class="nucleus-ticker__stat-value">—</span>
            <span class="nucleus-ticker__stat-label">awaiting data</span>
          `;
          this.statsContainer.appendChild(col);
        } else {
          const displayStats = stats.slice(0, 5);
          for (const stat of displayStats) {
            const col = document.createElement('div');
            col.className = 'nucleus-ticker__stat-col';
            col.innerHTML = `
              <span class="nucleus-ticker__stat-value">${this.escapeHtml(stat.value)}</span>
              <span class="nucleus-ticker__stat-label">${this.escapeHtml(stat.unit)}</span>
            `;
            this.statsContainer.appendChild(col);
          }
        }

        this.statsContainer.style.opacity = '1';
      }, reducedMotion ? 0 : 200);
    }

    escapeHtml(str: string) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    bindNav() {
      this.nextBtn?.addEventListener('click', () => {
        const next = (this.currentModeIndex + 1) % this.modes.length;
        this.setMode(next);
        (window as any).nucleusCarousel?.goToSlide(next);
      });

      this.prevBtn?.addEventListener('click', () => {
        const prev = (this.currentModeIndex - 1 + this.modes.length) % this.modes.length;
        this.setMode(prev);
        (window as any).nucleusCarousel?.goToSlide(prev);
      });
    }

    onSlideChange(modeIndex: number) {
      this.setMode(modeIndex);
    }
  }

  const ticker = new NucleusTicker(slides.map((slide) => buildModeStats(slide)));
  (window as any).nucleusTicker = ticker;

  const applySlideState = (index: number) => {
    currentSlide = index;
    slides[currentSlide].module.reset?.();
    ticker.onSlideChange(index);
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

  (window as any).nucleusCarousel = {
    goToSlide: (index: number) => {
      if (!Number.isFinite(index)) return;
      const bounded = ((Math.trunc(index) % slides.length) + slides.length) % slides.length;
      stopAutoAdvance();
      setState('exploring');
      transitionToSlide(bounded);
      resetIdleTimer();
    }
  };


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
