import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const SOURCE_LINE_EXTENSIONS = new Set(['.astro', '.ts', '.tsx', '.css', '.js', '.mjs']);
const MODULE_EXTENSIONS = new Set(['.astro', '.ts', '.tsx']);

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

const countLines = (filePath) => readFileSync(filePath, 'utf8').split('\n').length;

const getCodebaseStats = () => {
  const srcFiles = walk('src');
  const lineFiles = srcFiles.filter((filePath) => SOURCE_LINE_EXTENSIONS.has(path.extname(filePath)));
  const moduleFiles = srcFiles.filter((filePath) => {
    if (!MODULE_EXTENSIONS.has(path.extname(filePath))) return false;
    if (filePath.includes(`${path.sep}data${path.sep}`)) return false;
    if (filePath.endsWith('.d.ts')) return false;
    return true;
  });

  const lines = lineFiles.reduce((total, filePath) => total + countLines(filePath), 0);
  const modules = moduleFiles.length;
  return { lines, modules };
};

const getActivityData = () => {
  try {
    const diffStat = execSync('git diff --shortstat HEAD~1 HEAD 2>/dev/null').toString().trim();
    const insertions = Number.parseInt(diffStat.match(/(\d+) insertion/)?.[1] ?? '0', 10) || 0;
    const deletions = Number.parseInt(diffStat.match(/(\d+) deletion/)?.[1] ?? '0', 10) || 0;
    const filesChanged = Number.parseInt(diffStat.match(/(\d+) file/)?.[1] ?? '0', 10) || 0;
    const weeklyCommits = Number.parseInt(
      execSync('git log --oneline --since="7 days ago" 2>/dev/null | wc -l').toString().trim(),
      10
    ) || 0;

    return { insertions, deletions, filesChanged, weeklyCommits };
  } catch {
    return { insertions: 0, deletions: 0, filesChanged: 0, weeklyCommits: 0 };
  }
};

const getDirSize = (dir) => {
  let size = 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) size += getDirSize(fullPath);
      else size += statSync(fullPath).size;
    }
  } catch {
    return size;
  }
  return size;
};

const getBuildWeight = () => {
  const distSize = getDirSize('dist');
  if (distSize > 0) return { bytes: distSize, kb: Math.round(distSize / 1024) };

  if (existsSync('src/data/build-weight.json')) {
    try {
      const previousWeight = JSON.parse(readFileSync('src/data/build-weight.json', 'utf8'));
      const previousKb = Number(previousWeight.kb) || 0;
      if (previousKb > 0) {
        return {
          bytes: Number(previousWeight.bytes) || previousKb * 1024,
          kb: previousKb
        };
      }
    } catch {
      // noop
    }
  }

  return { bytes: 453 * 1024, kb: 453 };
};

mkdirSync('src/data', { recursive: true });

const codebaseStats = getCodebaseStats();
writeFileSync('src/data/codebase-stats.json', JSON.stringify(codebaseStats, null, 2));

const activityData = getActivityData();
writeFileSync('src/data/activity-data.json', JSON.stringify(activityData, null, 2));

const buildWeight = getBuildWeight();
writeFileSync('src/data/build-weight.json', JSON.stringify(buildWeight, null, 2));

writeFileSync('src/data/site-stats.json', JSON.stringify({ components: codebaseStats.modules, lines: codebaseStats.lines }, null, 2));
writeFileSync('src/data/commit-stats.json', JSON.stringify({ weeklyCommits: activityData.weeklyCommits }, null, 2));
