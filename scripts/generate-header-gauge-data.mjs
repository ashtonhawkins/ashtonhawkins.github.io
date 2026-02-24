import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const walk = (dir, files = []) => {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
};

const srcFiles = walk('src');
const componentFiles = srcFiles.filter((f) => f.startsWith(`src${path.sep}components${path.sep}`) && /\.(astro|tsx)$/.test(f));
const lineFiles = srcFiles.filter((f) => /\.(astro|ts|tsx|css|js)$/.test(f));
let totalLines = 0;
for (const file of lineFiles) totalLines += readFileSync(file, 'utf8').split('\n').length;

mkdirSync('src/data', { recursive: true });
writeFileSync('src/data/site-stats.json', JSON.stringify({ components: componentFiles.length, lines: totalLines }, null, 2));

let weeklyCommits = 0;
try { weeklyCommits = Number(execSync('git log --oneline --since="7 days ago" | wc -l').toString().trim()); } catch {}
writeFileSync('src/data/commit-stats.json', JSON.stringify({ weeklyCommits }, null, 2));

let previousWeight = { bytes: 0, kb: 0 };
if (existsSync('src/data/build-weight.json')) {
  try { previousWeight = JSON.parse(readFileSync('src/data/build-weight.json', 'utf8')); } catch {}
}

let bytes = Number(previousWeight.bytes) || 0;
if (existsSync('dist')) {
  try { bytes = Number(execSync('du -sb dist | cut -f1').toString().trim()) || bytes; } catch {}
}
writeFileSync('src/data/build-weight.json', JSON.stringify({ bytes, kb: Math.round(bytes / 1024) }, null, 2));
