import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const tables = JSON.parse(await readFile(new URL('records.json', root), 'utf8'));
const quote = value => value === null ? 'NULL' : typeof value === 'boolean' ? String(Number(value)) : typeof value === 'number' ? String(value) : "'" + (typeof value === 'object' ? JSON.stringify(value) : String(value)).replaceAll('\\', '\\\\').replaceAll("'", "''") + "'";
let sql = "SET NAMES utf8mb4;\nSET time_zone = '+00:00';\nSTART TRANSACTION;\n";
for (const [table, rows] of Object.entries(tables)) {
  if (!/^[a-z_]+$/.test(table)) throw new Error('Invalid table');
  if (!rows.length) continue;
  const columns = Object.keys(rows[0]);
  sql += `INSERT INTO \`${table}\` (${columns.map(column => '`' + column + '`').join(',')}) VALUES\n`;
  sql += rows.map(row => '(' + columns.map(column => quote(row[column])).join(',') + ')').join(',\n') + ';\n';
}
sql += 'COMMIT;\n';
await writeFile(new URL('seed.sql', root), sql);
const schema = await readFile(new URL('schema.sql', root), 'utf8');
const procedures = await readFile(new URL('procedures.sql', root), 'utf8');
await writeFile(new URL('init/00-frontend-demo.sql', root), schema + '\n' + sql + '\n' + procedures);
