export interface ScanProfile {
  subjectId: string;
  browser: string;
  engine: string;
  os: string;
  display: string;
  screenNative: string;
  colorDepth: string;
  gpu: string;
  webglVersion: string;
  maxTexture: string;
  processing: string;
  network: string;
  power?: string;
  colorPref: string;
  inputMethod: string;
  locale: string;
  languages: string;
  timezone: string;
  platform: string;
  cookies: string;
  dnt: string;
}

export interface BootState {
  profile: ScanProfile;
  refreshIntake: () => Promise<void>;
  clearToBoot: () => void;
  setSubjectId: () => string;
  getUptime: () => string;
}

const launchEpoch = Date.parse('2025-01-15T00:00:00Z');
const wait = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms));
const emDash = '—'.repeat(48);

const fmt = (n: number): string => new Intl.NumberFormat('en-US').format(n);

const uaParse = (ua: string): { browser: string; engine: string; os: string } => {
  const browser = /Edg\/(\d+)/i.exec(ua)?.[1]
    ? `EDGE ${/Edg\/(\d+)/i.exec(ua)![1]}`
    : /Chrome\/(\d+)/i.exec(ua)?.[1]
      ? `CHROME ${/Chrome\/(\d+)/i.exec(ua)![1]}`
      : /Version\/(\d+).+Safari/i.exec(ua)?.[1]
        ? `SAFARI ${/Version\/(\d+).+Safari/i.exec(ua)![1]}`
        : /Firefox\/(\d+)/i.exec(ua)?.[1]
          ? `FIREFOX ${/Firefox\/(\d+)/i.exec(ua)![1]}`
          : 'UNKNOWN';
  const os = /Windows/i.test(ua)
    ? 'WINDOWS'
    : /Mac OS X/i.test(ua)
      ? 'MACOS'
      : /Android/i.test(ua)
        ? 'ANDROID'
        : /(iPhone|iPad|iOS)/i.test(ua)
          ? 'IOS'
          : /Linux/i.test(ua)
            ? 'LINUX'
            : 'UNKNOWN';
  const engine = /AppleWebKit\/(\d+)/i.exec(ua)?.[1]
    ? `WEBKIT ${/AppleWebKit\/(\d+)/i.exec(ua)![1]}`
    : /Gecko\/(\d+)/i.exec(ua)?.[1]
      ? `GECKO ${/Gecko\/(\d+)/i.exec(ua)![1]}`
      : /Chrome\/(\d+)/i.exec(ua)?.[1]
        ? `BLINK ${/Chrome\/(\d+)/i.exec(ua)![1]}`
        : 'UNKNOWN';
  return { browser, engine, os };
};

const parseRenderer = (raw: string): string => {
  const upper = raw.toUpperCase();
  const match = upper.match(/(APPLE\s+[A-Z0-9\s]+|NVIDIA\s+[A-Z0-9\s]+|AMD\s+[A-Z0-9\s]+|INTEL\s*[A-Z0-9()\s]+)/);
  return (match?.[1] ?? raw).replace(/ANGLE \(|\)|METAL|OPENGL|DIRECT3D11/gi, '').replace(/\s+/g, ' ').trim();
};

const detect = async (subjectId: string): Promise<ScanProfile> => {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; rtt?: number };
    getBattery?: () => Promise<{ level: number; charging: boolean }>;
  };

  const glCanvas = document.createElement('canvas');
  const gl2 = glCanvas.getContext('webgl2');
  const gl = gl2 ?? glCanvas.getContext('webgl');
  const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info') as { UNMASKED_RENDERER_WEBGL: number } | null;
  const renderer = debugInfo ? (gl?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string) : 'UNKNOWN';

  let power: string | undefined;
  if (typeof nav.getBattery === 'function') {
    try {
      const battery = await nav.getBattery();
      power = `${Math.round(battery.level * 100)}% ${battery.charging ? 'CHARGING' : 'DISCHARGING'}`;
    } catch {
      power = undefined;
    }
  }

  const parsed = uaParse(navigator.userAgent);
  const connection = nav.connection?.effectiveType
    ? `${nav.connection.effectiveType.toUpperCase()} / ~${Math.round(nav.connection.rtt ?? 0)}MS RTT`
    : 'UNRESOLVED';

  return {
    subjectId,
    browser: `${parsed.browser} / ${parsed.os}`,
    engine: parsed.engine,
    os: parsed.os,
    display: `${window.innerWidth} × ${window.innerHeight} @ ${(window.devicePixelRatio || 1).toFixed(2).replace('.00', '')}X / ${screen.colorDepth}-BIT`,
    screenNative: `${screen.width} × ${screen.height}`,
    colorDepth: `${screen.colorDepth}-BIT`,
    gpu: parseRenderer(renderer || 'UNKNOWN'),
    webglVersion: gl2 ? 'WEBGL 2.0' : gl ? 'WEBGL 1.0' : 'UNKNOWN',
    maxTexture: gl ? String(gl.getParameter(gl.MAX_TEXTURE_SIZE)) : 'UNKNOWN',
    processing: navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} LOGICAL CORES` : 'UNKNOWN',
    network: connection,
    power,
    colorPref: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'DARK MODE ENABLED' : 'LIGHT MODE ENABLED',
    inputMethod:
      navigator.maxTouchPoints > 0 || 'ontouchstart' in window
        ? `TOUCH / ${Math.max(navigator.maxTouchPoints || 1, 1)} POINTS`
        : 'POINTER / NO TOUCH DETECTED',
    locale: navigator.language.toUpperCase(),
    languages: navigator.languages.map((item) => item.toUpperCase()).join(' / '),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: navigator.platform.toUpperCase(),
    cookies: navigator.cookieEnabled ? 'ENABLED' : 'DISABLED',
    dnt: navigator.doNotTrack ?? 'UNSET'
  };
};

const typeLine = async (el: HTMLElement, text: string, speed: [number, number], instant: boolean): Promise<void> => {
  if (instant) {
    el.textContent = text;
    return;
  }
  for (const c of text) {
    el.textContent += c;
    await wait(Math.max(speed[0], Math.min(speed[1], speed[0] + Math.random() * (speed[1] - speed[0]))));
  }
};

const makeRow = (container: HTMLElement, cls = 'cs-line'): HTMLElement => {
  const row = document.createElement('p');
  row.className = cls;
  row.dataset.glitchable = '1';
  container.append(row);
  return row;
};

const kv = (k: string, v: string): string => `${k.padEnd(16, ' ')}${v}`;

export const initBootSequence = async (container: HTMLElement): Promise<BootState> => {
  let profile: ScanProfile;
  let interval = 0;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const newId = (): string => `AH-2026-${String((Date.now() % 90000) + 10000).slice(-5)}`;
  let subjectId = newId();

  const render = async (instant = false, intakeOnly = false): Promise<void> => {
    if (!intakeOnly) container.innerHTML = '';
    profile = await detect(subjectId);
    const booted = instant || reduce || sessionStorage.getItem('ah-sys-booted') === 'true';

    const buildDate = new Date().toISOString().slice(0, 10).replaceAll('-', '.');

    if (!intakeOnly) {
      const h1 = makeRow(container, 'cs-line cs-head');
      await typeLine(h1, 'ASHTON HAWKINS — PERSONAL OPERATING SYSTEM', [40, 58], booted);
      const h2 = makeRow(container, 'cs-line cs-sub');
      await typeLine(h2, `BUILD ${buildDate} — REV 847`, [40, 58], booted);
      const h3 = makeRow(container, 'cs-line cs-meta');
      await typeLine(h3, 'CLASSIFICATION: UNRESTRICTED', [40, 58], booted);
      makeRow(container, 'cs-divider').textContent = emDash;
      if (!booted) await wait(500);
    }

    const intakeLines: [string, string, string?][] = [
      ['cs-line cs-primary', 'INCOMING CONNECTION LOGGED'],
      ['cs-line', `SUBJECT ID: ${profile.subjectId}`],
      ['cs-line', ''],
      ['cs-line', kv('BROWSER IDENT', profile.browser)],
      ['cs-line', kv('DISPLAY CONFIG', profile.display)],
      ['cs-line', kv('GPU SUBSYSTEM', `${profile.gpu} ${profile.webglVersion}`)],
      ['cs-line', kv('PROCESSING', profile.processing)],
      ['cs-line', kv('NETWORK CLASS', profile.network)],
      ...(profile.power ? [['cs-line', kv('POWER STATUS', profile.power)] as [string, string]] : []),
      ['cs-line', kv('COLOR PREF', profile.colorPref)],
      ['cs-line', kv('INPUT METHOD', profile.inputMethod)],
      ['cs-line', kv('LOCALE', profile.locale)]
    ];

    for (const [cls, text] of intakeLines) {
      const row = makeRow(container, cls);
      await typeLine(row, text, [30, 45], booted);
      if (!booted) await wait(120 + Math.random() * 130);
    }

    makeRow(container, 'cs-divider').textContent = emDash;
    if (!booted) await wait(400);
    const access = makeRow(container, 'cs-line cs-access crt-glow');
    await typeLine(access, 'CONNECTION PERMITTED — READ-ONLY ACCESS GRANTED', [24, 34], booted);
    if (!booted) await wait(300);

    const up = makeRow(container, 'cs-line');
    up.dataset.uptime = '1';
    up.innerHTML = `<span class="cs-key">SYS UPTIME       </span><span class="cs-up"></span><span class="cs-accent">S</span>`;
    const status = makeRow(container, 'cs-line cs-primary');
    await typeLine(status, 'STATUS           SITE RECONSTRUCTION IN PROGRESS', [28, 38], booted);
    makeRow(container, 'cs-line cs-cursor').textContent = '▮';

    const paintUptime = (): void => {
      const node = up.querySelector('.cs-up');
      if (node) node.textContent = fmt(Math.floor((Date.now() - launchEpoch) / 1000));
    };
    window.clearInterval(interval);
    paintUptime();
    interval = window.setInterval(paintUptime, 1000);
    sessionStorage.setItem('ah-sys-booted', 'true');
  };

  await render(false, false);

  return {
    get profile() {
      return profile;
    },
    refreshIntake: async () => {
      subjectId = newId();
      const children = [...container.children];
      let start = children.findIndex((n) => n.textContent?.includes('INCOMING CONNECTION LOGGED'));
      if (start === -1) start = children.length;
      children.slice(start).forEach((node) => node.remove());
      await render(false, true);
    },
    clearToBoot: () => {
      void render(true, false);
    },
    setSubjectId: () => {
      subjectId = newId();
      return subjectId;
    },
    getUptime: () => fmt(Math.floor((Date.now() - launchEpoch) / 1000))
  };
};
