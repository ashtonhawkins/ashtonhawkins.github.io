import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function main() {
  const target = resolve('src/data/feeds-cache.json');
  const payload = {
    updatedAt: new Date().toISOString(),
    items: {
      letterboxd: [],
      literal: [],
      spotify: [],
      x: []
    }
  };

  await writeFile(target, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
