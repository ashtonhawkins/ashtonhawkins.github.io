import type { BootState } from './BootSequence';

interface Nodes {
  output: HTMLElement;
  form: HTMLElement;
  input: HTMLInputElement;
}

const divider = '—'.repeat(48);
const wait = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms));

const append = async (root: HTMLElement, text: string, cls = '', speed = 0): Promise<void> => {
  const line = document.createElement('p');
  line.className = `cs-line ${cls}`.trim();
  root.append(line);
  if (!speed) {
    line.textContent = text;
  } else {
    for (const ch of text) {
      line.textContent += ch;
      await wait(speed);
    }
  }
  root.scrollTop = root.scrollHeight;
};

const row = (k: string, v: string): string => `${k.padEnd(12, ' ')}${v}`;

export const initQueryInterface = (nodes: Nodes, boot: BootState): void => {
  const { output, form, input } = nodes;
  const history: string[] = [];
  let idx = -1;

  const trimLines = (): void => {
    const lines = output.querySelectorAll('.cs-line');
    if (lines.length > 50) {
      [...lines].slice(0, lines.length - 50).forEach((n) => n.remove());
    }
  };

  const renderCatalog = async (): Promise<void> => {
    await append(output, divider);
    await append(output, 'AVAILABLE QUERIES', 'cs-primary');
    await append(output, divider);
    const cmds = [
      ['CATALOG', 'THIS DIRECTORY'],
      ['SUBJECT', 'CONNECTION INTAKE REPORT'],
      ['DOSSIER', 'PERSONNEL FILE: HAWKINS, A.'],
      ['MANIFEST', 'PROJECT FILE INDEX'],
      ['SYSREPORT', 'SYSTEM DIAGNOSTIC'],
      ['NETCHECK', 'NETWORK SUBSYSTEM AUDIT'],
      ['RESCAN', 'RE-EXECUTE CONNECTION INTAKE'],
      ['CLEAR', 'PURGE TERMINAL OUTPUT']
    ];
    for (const [k, v] of cmds) await append(output, `${k.padEnd(12, ' ')}${v}`);
    await append(output, divider);
  };

  const renderSubject = async (): Promise<void> => {
    const p = boot.profile;
    await append(output, divider);
    await append(output, 'SUBJECT INTAKE REPORT', 'cs-primary');
    await append(output, `ID: ${p.subjectId}`);
    await append(output, divider);
    for (const line of [
      row('BROWSER IDENT', p.browser),
      row('ENGINE', p.engine),
      row('DISPLAY CONFIG', p.display),
      row('SCREEN NATIVE', p.screenNative),
      row('COLOR DEPTH', p.colorDepth),
      row('GPU SUBSYSTEM', p.gpu),
      row('PROCESSING', p.processing),
      row('NETWORK CLASS', p.network),
      ...(p.power ? [row('POWER STATUS', p.power)] : []),
      row('COLOR PREF', p.colorPref),
      row('INPUT METHOD', p.inputMethod),
      row('LOCALE', p.locale),
      row('LANGUAGES', p.languages),
      row('TIMEZONE', p.timezone),
      row('PLATFORM', p.platform),
      row('COOKIES', p.cookies),
      row('DO NOT TRACK', p.dnt),
      row('WEBGL VERSION', p.webglVersion),
      row('MAX TEXTURE', p.maxTexture)
    ]) {
      await append(output, line);
    }
    await append(output, divider);
  };

  const renderManifest = async (): Promise<void> => {
    await append(output, divider);
    await append(output, 'PROJECT MANIFEST — ashtonhawkins.com', 'cs-primary');
    await append(output, divider);
    await append(output, 'FILE                  STATUS      PRIORITY');
    const files = [
      ['index.astro', 'LIVE', '—'],
      ['about.astro', 'WIP', 'HIGH'],
      ['writing.astro', 'WIP', 'HIGH'],
      ['work.astro', 'WIP', 'MEDIUM'],
      ['cycling.astro', 'WIP', 'MEDIUM'],
      ['now.astro', 'WIP', 'LOW'],
      ['travel.astro', 'WIP', 'LOW']
    ];
    for (const [file, state, pr] of files) {
      await append(output, `${file.padEnd(21, ' ')}[${state}]`.padEnd(33, ' ') + pr, state === 'LIVE' ? 'cs-accent' : 'cs-meta');
    }
    await wait(160);
    await append(output, divider);
    await append(output, 'TOTAL: 7 FILES — 1 LIVE / 6 IN PROGRESS');
    await append(output, divider);
  };

  const renderSys = async (): Promise<void> => {
    await append(output, divider);
    await append(output, 'SYSTEM DIAGNOSTIC', 'cs-primary');
    await append(output, divider);
    for (const line of [
      row('UPTIME', `${boot.getUptime()}S`),
      row('FRAMEWORK', 'ASTRO 5 + TYPESCRIPT'),
      row('HOST', 'GITHUB PAGES'),
      row('BUILD SYSTEM', 'GITHUB ACTIONS'),
      row('DATA PIPELINE', 'CRON — 6H INTERVAL'),
      row('INTEGRATIONS', 'STRAVA · LAST.FM · OURA · LETTERBOXD'),
      row('API STATUS', '4/4 NOMINAL'),
      row('LAST DEPLOY', '2026-02-23'),
      row('REVISION', '847'),
      row('CLASSIFICATION', 'UNRESTRICTED')
    ]) {
      await append(output, line);
    }
    await append(output, divider);
  };

  const renderDossier = async (): Promise<void> => {
    const lines = [
      divider,
      'PERSONNEL FILE — RESTRICTED',
      divider,
      'SURNAME          HAWKINS',
      'GIVEN            ASHTON',
      'CLASSIFICATION   LEVEL 4 — SYSTEMS OPERATOR',
      'DOMAIN           DIGITAL INFRASTRUCTURE & GROWTH SYSTEMS',
      '',
      'CORE FUNCTIONS   CONVERSION ARCHITECTURE',
      '                 ORGANIC ACQUISITION SYSTEMS',
      '                 INFORMATION TOPOLOGY',
      '                 BEHAVIORAL ANALYTICS',
      '                 PLATFORM OPERATIONS',
      '',
      'DEPLOYMENT       ENTERPRISE ECOMMERCE — FORTUNE 1',
      'HISTORY          HEALTHCARE SYSTEMS',
      '                 CONSULTING OPERATIONS',
      '                 INDEPENDENT CONTRACTS',
      '',
      'METHODOLOGY      COMPOUND GROWTH THROUGH',
      '                 SYSTEMATIC OPTIMIZATION',
      '',
      'STATUS           ████████ ACCEPTING ENGAGEMENTS ████████',
      divider
    ];
    for (const line of lines) await append(output, line, line.includes('████') ? 'cs-accent' : '');
  };

  const renderNetcheck = async (): Promise<void> => {
    await append(output, divider);
    await append(output, 'NETWORK SUBSYSTEM AUDIT', 'cs-primary');
    await append(output, divider);
    const services = ['STRAVA', 'LAST.FM', 'OURA', 'LETTERBOXD'];
    let degraded = false;
    for (const name of services) {
      const timeout = Math.random() < 0.1;
      if (timeout) degraded = true;
      const latency = 15 + Math.floor(Math.random() * 106);
      let prefix = `PINGING ${name} `;
      for (let i = 0; i < 13; i += 1) {
        prefix += '.';
        await append(output, prefix, '', 12);
        output.lastElementChild?.remove();
      }
      await wait(300 + Math.random() * 300);
      await append(output, `${prefix} ${timeout ? '[TIMEOUT]' : `${latency}MS [OK]`}`, timeout ? 'cs-warn' : '');
    }
    await append(output, degraded ? 'PARTIAL DEGRADATION DETECTED' : 'ALL SUBSYSTEMS NOMINAL', degraded ? 'cs-warn' : 'cs-accent');
    await append(output, divider);
  };

  const execute = async (raw: string): Promise<void> => {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;
    await append(output, `QUERY // ${raw.toUpperCase()}`, 'cs-meta');
    if (cmd === 'catalog') await renderCatalog();
    else if (cmd === 'subject') await renderSubject();
    else if (cmd === 'dossier') await renderDossier();
    else if (cmd === 'manifest') await renderManifest();
    else if (cmd === 'sysreport') await renderSys();
    else if (cmd === 'netcheck') await renderNetcheck();
    else if (cmd === 'rescan') await boot.refreshIntake();
    else if (cmd === 'clear') {
      output.innerHTML = '';
      boot.clearToBoot();
    } else if (cmd.startsWith('sudo')) {
      await append(output, 'ACCESS DENIED — CLEARANCE INSUFFICIENT. THIS INCIDENT HAS BEEN LOGGED.', 'cs-warn');
    } else if (cmd === 'exit') {
      await append(output, 'SESSION TERMINATED.', 'cs-warn');
      form.classList.add('is-hidden');
      window.setTimeout(() => form.classList.remove('is-hidden'), 2000);
    } else if (['hello', 'hi', 'hey'].includes(cmd)) {
      await append(output, "THIS IS NOT A CONVERSATIONAL INTERFACE. TYPE 'CATALOG' FOR AVAILABLE QUERIES.");
    } else {
      await append(output, `UNRECOGNIZED QUERY: ${raw.toUpperCase()}. TYPE 'CATALOG' FOR DIRECTORY.`, 'cs-meta');
    }
    await append(output, '');
    trimLines();
  };

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!history.length) return;
      idx = Math.min(history.length - 1, idx + 1);
      input.value = history[history.length - 1 - idx];
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      idx = Math.max(-1, idx - 1);
      input.value = idx === -1 ? '' : history[history.length - 1 - idx];
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const value = input.value;
      history.push(value);
      if (history.length > 20) history.shift();
      idx = -1;
      input.value = '';
      void execute(value);
    }
  });
};
