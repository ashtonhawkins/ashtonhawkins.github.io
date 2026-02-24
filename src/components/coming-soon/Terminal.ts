import type { BootController } from './BootSequence';

interface TerminalElements {
  shell: HTMLElement;
  history: HTMLElement;
  inputWrap: HTMLElement;
  input: HTMLInputElement;
  hint: HTMLElement;
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const initTerminal = (els: TerminalElements, boot: BootController): void => {
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  let open = false;
  const rows: HTMLElement[] = [];

  const addRow = (text: string, className = 'cs-muted', html = false): HTMLElement => {
    const row = document.createElement('div');
    row.className = `cs-term-row ${className}`;
    if (html) row.innerHTML = text;
    else row.textContent = text;
    els.history.appendChild(row);
    rows.push(row);
    while (rows.length > 50) {
      rows.shift()?.remove();
    }
    els.history.scrollTop = els.history.scrollHeight;
    return row;
  };

  const typeOut = async (text: string, className = 'cs-muted'): Promise<void> => {
    const row = addRow('', className);
    for (const ch of text) {
      row.textContent += ch;
      await sleep(20);
    }
  };

  const visitorProfileLines = (): string[] => [
    '— VISITOR PROFILE —',
    `BROWSER: ${boot.profile.browser}`,
    `VIEWPORT: ${boot.profile.viewport}`,
    `LOCAL TIME: ${boot.profile.localTime}`,
    `CONNECTION: ${boot.profile.connection}`,
    `GPU: ${boot.profile.gpu}`,
    `CORES: ${boot.profile.cores}`,
    `DARK MODE: ${boot.profile.darkMode}`,
    `TOUCH: ${boot.profile.touch}`,
    ...(boot.profile.battery ? [`BATTERY: ${boot.profile.battery}`] : []),
    `SCREEN: ${boot.profile.screen}`,
    `PIXEL RATIO: ${boot.profile.pixelRatio}`,
    `LANGUAGES: ${boot.profile.languages}`
  ];

  const openTerminal = (): void => {
    open = true;
    els.shell.classList.add('is-open');
    els.hint.classList.add('is-hidden');
    els.inputWrap.hidden = false;
    els.input.focus();
  };

  const closeTerminal = (): void => {
    open = false;
    els.shell.classList.remove('is-open');
    els.inputWrap.hidden = true;
    els.hint.classList.remove('is-hidden');
    els.input.value = '';
  };

  const runCommand = async (raw: string): Promise<void> => {
    const cmd = raw.trim().toLowerCase();
    addRow(`> ${raw}`, 'cs-primary');
    if (!cmd) return;

    if (cmd === 'help') {
      await typeOut('AVAILABLE COMMANDS: help, whoami, status, ls, ping, about, scan, clear, exit');
      return;
    }
    if (cmd === 'whoami') {
      for (const line of visitorProfileLines()) await typeOut(line);
      return;
    }
    if (cmd === 'status') {
      const lines = [
        '— SYSTEM STATUS —',
        `UPTIME: ${boot.getUptime()}S`,
        'PAGES: 12 TOTAL [7 WIP]',
        'APIS: STRAVA · LAST.FM · OURA · LETTERBOXD',
        'LAST BUILD: 2026-02-20',
        'FRAMEWORK: ASTRO + TYPESCRIPT',
        'HOST: GITHUB PAGES'
      ];
      for (const line of lines) await typeOut(line);
      return;
    }
    if (cmd === 'ls') {
      addRow('index.astro <span class="cs-ok">[LIVE]</span>', 'cs-muted', true);
      ['about', 'writing', 'work', 'cycling', 'now', 'travel'].forEach((name) =>
        addRow(`${name}.astro <span class="cs-wip">[WIP]</span>`, 'cs-muted', true)
      );
      return;
    }
    if (cmd === 'ping') {
      const apis = ['STRAVA API', 'LAST.FM API', 'OURA API', 'LETTERBOXD'];
      for (const api of apis) {
        await sleep(300 + Math.random() * 300);
        const timeout = Math.random() < 0.1;
        const ms = Math.floor(15 + Math.random() * 105);
        addRow(
          `PINGING ${api}... ${ms}MS <span class="${timeout ? 'cs-timeout' : 'cs-ok'}">[${timeout ? 'TIMEOUT' : 'OK'}]</span>`,
          'cs-muted',
          true
        );
      }
      return;
    }
    if (cmd === 'about') {
      const lines = [
        'ASHTON HAWKINS',
        'DIRECTOR, WEB EXPERIENCE & OPTIMIZATION',
        'SF BAY AREA',
        '',
        'BUILDING DIGITAL SYSTEMS THAT COMPOUND.',
        'CRO · SEO · INFORMATION ARCHITECTURE · ANALYTICS'
      ];
      for (const line of lines) await typeOut(line, 'cs-primary');
      return;
    }
    if (cmd === 'scan') {
      await boot.rerunScan();
      await typeOut('SCAN COMPLETE.', 'cs-accent');
      return;
    }
    if (cmd === 'clear') {
      els.history.innerHTML = '';
      return;
    }
    if (cmd === 'exit') {
      closeTerminal();
      return;
    }
    if (cmd.startsWith('sudo')) {
      await typeOut('NICE TRY.', 'cs-accent');
      return;
    }

    await typeOut(`COMMAND NOT FOUND: ${cmd}_`);
  };

  document.addEventListener('keydown', (event) => {
    if (!open && (event.key === '/' || event.key === '~')) {
      event.preventDefault();
      openTerminal();
      return;
    }
    if (!open) return;
    if (event.key === 'Escape') closeTerminal();
  });

  els.input.addEventListener('keydown', async (event) => {
    if (event.key !== 'Enter') return;
    const value = els.input.value;
    els.input.value = '';
    await runCommand(value);
  });

  if (isMobile) {
    els.hint.addEventListener('click', openTerminal);
  }

  window.setTimeout(() => els.hint.classList.add('is-visible'), 2000);
};
