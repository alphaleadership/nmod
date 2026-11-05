import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const pattern = /(from\s+['"])(\.{1,2}\/[^'"]+)\.ts(['"])/g;

for (const name of await readdir(dist)) {
  if (!name.endsWith('.d.ts')) continue;
  const path = join(dist, name);
  const source = await readFile(path, 'utf8');
  const fixed = source.replace(pattern, '$1$2.js$3');
  if (fixed !== source) await writeFile(path, fixed);
}
