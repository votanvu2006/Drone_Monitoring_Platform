import { readFile, writeFile } from 'node:fs/promises';
import { buildSnapshot } from './build-snapshot.mjs';
const root = new URL('../', import.meta.url);
const tables = JSON.parse(await readFile(new URL('records.json', root), 'utf8'));
await writeFile(new URL('frontend.snapshot.json', root), JSON.stringify(buildSnapshot(tables), null, 2) + '\n');
