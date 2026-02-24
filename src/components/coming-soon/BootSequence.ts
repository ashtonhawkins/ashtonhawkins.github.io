export interface VisitorProfile {
  browser: string;
  viewport: string;
  localTime: string;
  connection: string;
  gpu: string;
  cores: string;
  darkMode: string;
  touch: string;
  battery?: string;
  screen: string;
  pixelRatio: string;
  languages: string;
}

export interface BootController {
  profile: VisitorProfile;
  rerunScan: () => Promise<void>;
  clearTerminal: () => void;
  getUptime: () => string;
}

const LAUNCH = new Date('2025-01-15T00:00:00Z').getTime();
const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const parseUA = (ua: string): string => {
  const upper = ua.toUpperCase();
  const os = /WINDOWS/.test(upper)
    ? 'WINDOWS'
    : /MAC OS X/.test(upper)
      ? 'MACOS'
      : /ANDROID/.test(upper)
        ? 'ANDROID'
        : /(IPHONE|IPAD|IOS)/.test(upper)
          ? 'IOS'
          : /LINUX/.test(upper)
            ? 'LINUX'
            : 'UNKNOWN';
  const edge = ua.match(/EDG\/(\d+)/i)?.[1];
  const chrome = ua.match(/CHROME\/(\d+)/i)?.[1];
  const safari = ua.match(/VERSION\/(\d+).+SAFARI/i)?.[1];
  const firefox = ua.match(/FIREFOX\/(\d+)/i)?.[1];
  const browser = edge
    ? `EDGE ${edge}`
    : chrome
      ? `CHROME ${chrome}`
      : safari
        ? `SAFARI ${safari}`
        : firefox
          ? `FIREFOX ${firefox}`
          : 'UNKNOWN';
  return `${browser} / ${os}`;
};

const currentLocalTime = (): string => {
  const now = new Date();
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short'
  }).format(now).replace(',', '');
};

const getGpu = (): string => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl');
  if (!gl) return 'UNKNOWN';
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  if (!ext) return 'UNKNOWN';
  const raw = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
  const extracted = raw.match(/(Apple [^,)]+|NVIDIA [^,)]+|Intel\(R\) [^,)]+|AMD [^,)]+|GeForce [^,)]+)/i)?.[1];
  return (extracted ?? raw.split(',')[0] ?? 'UNKNOWN').replace(/ANGLE \(|\)$/g, '').trim().toUpperCase();
};

const detectVisitor = async (): Promise<VisitorProfile> => {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; rtt?: number };
    getBattery?: () => Promise<{ level: number; charging: boolean }>;
  };

  let battery: string | undefined;
  if (typeof nav.getBattery === 'function') {
    try {
      const info = await nav.getBattery();
      battery = `${Math.round(info.level * 100)}% [${info.charging ? 'CHARGING' : 'DISCHARGING'}]`;
    } catch {
      battery = undefined;
    }
  }

  const connection = nav.connection?.effectiveType
    ? `${nav.connection.effectiveType.toUpperCase()}${typeof nav.connection.rtt === 'number' ? ` ~${nav.connection.rtt}MS RTT` : ''}`
    : 'UNKNOWN';

  return {
    browser: parseUA(navigator.userAgent),
    viewport: `${window.innerWidth} × ${window.innerHeight}`,
    localTime: currentLocalTime(),
    connection,
    gpu: getGpu(),
    cores: navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} LOGICAL` : 'UNKNOWN',
    darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'PREFERRED' : 'NOT PREFERRED',
    touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0 ? 'SUPPORTED' : 'NOT SUPPORTED',
    battery,
    screen: `${window.screen.width} × ${window.screen.height}`,
    pixelRatio: `${window.devicePixelRatio || 1}`,
    languages: navigator.languages?.join(', ').toUpperCase() ?? navigator.language.toUpperCase()
  };
};

export const initBootSequence = async (
  container: HTMLElement,
  onComplete: () => void
): Promise<BootController> => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const booted = sessionStorage.getItem('ah-booted') === '1';
  const profile = await detectVisitor();
  const lines = new Map<number, HTMLDivElement>();

  const uptime = () => Math.max(0, Math.floor((Date.now() - LAUNCH) / 1000)).toLocaleString();

  const addLine = (line: string, className = ''): HTMLDivElement => {
    const row = document.createElement('div');
    row.className = `cs-line ${className}`.trim();
    row.dataset.glitch = 'true';
    row.textContent = line;
    container.appendChild(row);
    return row;
  };

  const typeLine = async (line: HTMLDivElement, text: string, speed = 45): Promise<void> => {
    line.textContent = '';
    if (text.startsWith('> ')) {
      line.textContent = '> ';
      text = text.slice(2);
    }
    for (const char of text) {
      line.textContent += char;
      await sleep(Math.max(12, speed + Math.random() * 30 - 15));
    }
  };

  const config = [
    { text: '> ASHTON HAWKINS_', cls: 'cs-title', speed: 50 },
    { text: '> SYS INIT...', cls: 'cs-muted', speed: 50 },
    { text: '', cls: '', speed: 0 },
    { text: '> VISITOR DETECTED', cls: 'cs-primary', speed: 34 },
    { text: `> BROWSER: ${profile.browser}`, cls: 'cs-muted', speed: 34 },
    { text: `> VIEWPORT: ${profile.viewport}`, cls: 'cs-muted', speed: 34 },
    { text: `> LOCAL TIME: ${profile.localTime}`, cls: 'cs-muted', speed: 34 },
    { text: `> CONNECTION: ${profile.connection}`, cls: 'cs-muted', speed: 34 },
    { text: `> GPU: ${profile.gpu}`, cls: 'cs-muted', speed: 34 },
    { text: `> CORES: ${profile.cores}`, cls: 'cs-muted', speed: 34 },
    { text: `> DARK MODE: ${profile.darkMode}`, cls: 'cs-muted', speed: 34 },
    { text: `> TOUCH: ${profile.touch}`, cls: 'cs-muted', speed: 34 }
  ];
  if (profile.battery) config.push({ text: `> BATTERY: ${profile.battery}`, cls: 'cs-muted', speed: 34 });
  config.push({ text: '', cls: '', speed: 0 }, { text: `> UPTIME: ${uptime()}S`, cls: 'cs-accent', speed: 36 });
  config.push({ text: '> STATUS: BUILDING SOMETHING NEW', cls: 'cs-primary', speed: 42 });
  config.push({ text: '> ▮', cls: 'cs-cursor-line', speed: 1 });

  const render = async (instant: boolean): Promise<void> => {
    container.innerHTML = '';
    for (let i = 0; i < config.length; i += 1) {
      const item = config[i];
      const row = addLine(item.text, item.cls);
      lines.set(i, row);
      if (!instant) {
        if (item.text) {
          await typeLine(row, item.text, item.speed);
          await sleep(150 + Math.random() * 150);
        } else {
          await sleep(i === 2 ? 400 : 300);
        }
      }
    }
  };

  await render(reduced || booted);
  sessionStorage.setItem('ah-booted', '1');

  window.setInterval(() => {
    const idx = 6;
    const row = lines.get(idx);
    if (row) row.textContent = `> LOCAL TIME: ${currentLocalTime()}`;
    const uptimeRow = lines.get(config.length - 3);
    if (uptimeRow) uptimeRow.textContent = `> UPTIME: ${uptime()}S`;
  }, 1000);

  container.querySelectorAll<HTMLElement>('[data-glitch="true"]').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      el.classList.remove('is-glitching');
      void el.offsetWidth;
      el.classList.add('is-glitching');
      window.setTimeout(() => el.classList.remove('is-glitching'), 150);
    });
  });

  onComplete();

  return {
    profile,
    rerunScan: async () => {
      const start = 3;
      for (let i = start; i < config.length - 1; i += 1) {
        const row = lines.get(i);
        if (!row) continue;
        if (!config[i].text) {
          row.textContent = '';
          await sleep(220);
        } else {
          await typeLine(row, config[i].text, i < 12 ? 32 : 36);
        }
      }
    },
    clearTerminal: () => {
      container.innerHTML = '';
    },
    getUptime: uptime
  };
};
