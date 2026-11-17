import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'src', 'modules');
const files = (await readdir(directory)).filter((file) => file.endsWith('.js')).sort();
let failed = false;

for (const file of files) {
  const absolute = path.join(directory, file);
  const source = await readFile(absolute, 'utf8');
  const syntax = spawnSync(process.execPath, ['--check', absolute], { encoding: 'utf8' });
  const problems = [];
  if (syntax.status !== 0) problems.push((syntax.stderr || syntax.stdout).trim());
  if (!/export\s+default\s*\{/.test(source)) problems.push('default export fehlt');
  if (!/name\s*:\s*['"`][^'"`]+['"`]/.test(source)) problems.push('Modulname fehlt');
  if (problems.length) {
    failed = true;
    process.stderr.write(`FEHLER ${file}: ${problems.join(' | ')}\n`);
  } else {
    process.stdout.write(`OK ${file}\n`);
  }
}

if (failed) process.exit(1);
process.stdout.write(`\n${files.length} Module strukturell geprüft. Für den Gateway-Test werden installierte Abhängigkeiten und ein Discord-Token benötigt.\n`);
