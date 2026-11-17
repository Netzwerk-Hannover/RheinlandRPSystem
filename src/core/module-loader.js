import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function loadModules(directory, logger) {
  const files = (await readdir(directory)).filter((file) => file.endsWith('.js')).sort();
  const modules = [];
  for (const file of files) {
    try {
      const loaded = await import(pathToFileURL(path.join(directory, file)).href);
      const module = loaded.default;
      if (!module?.name) throw new Error('Modul exportiert keinen Namen');
      modules.push(module);
      logger.info(`[MODULE] ${module.name} geladen`);
    } catch (error) {
      logger.error(`[MODULE] ${file} konnte nicht geladen werden: ${error.stack ?? error.message}`);
    }
  }
  return modules;
}
