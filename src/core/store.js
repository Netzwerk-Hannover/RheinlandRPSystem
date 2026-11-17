import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from './config.js';

const DEFAULT_DATA = { schemaVersion: 1 };

export class JsonStore {
  constructor() {
    this.directory = path.resolve(env('DATA_DIR', './data'));
    this.file = path.join(this.directory, 'rheinland-data.json');
    this.data = structuredClone(DEFAULT_DATA);
    this.queue = Promise.resolve();
  }

  async init() {
    await mkdir(this.directory, { recursive: true });
    try {
      const raw = await readFile(this.file, 'utf8');
      const parsed = JSON.parse(raw);
      this.data = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? { ...structuredClone(DEFAULT_DATA), ...parsed }
        : structuredClone(DEFAULT_DATA);
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error(`Datenbank konnte nicht gelesen werden: ${error.message}`);
      await this.#persist();
    }
    return this;
  }

  get(collection, key, fallback = null) {
    const value = this.data?.[collection]?.[String(key)];
    return value === undefined ? fallback : structuredClone(value);
  }

  all(collection) {
    const section = this.data?.[collection] ?? {};
    return Object.entries(section).map(([key, value]) => [key, structuredClone(value)]);
  }

  async set(collection, key, value) {
    return this.transaction((data) => {
      data[collection] ??= {};
      data[collection][String(key)] = structuredClone(value);
    });
  }

  async delete(collection, key) {
    return this.transaction((data) => {
      if (data[collection]) delete data[collection][String(key)];
    });
  }

  async transaction(mutator) {
    const operation = this.queue.then(async () => {
      mutator(this.data);
      await this.#persist();
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }

  async #persist() {
    await mkdir(this.directory, { recursive: true });
    const temporary = `${this.file}.tmp`;
    await writeFile(temporary, `${JSON.stringify(this.data, null, 2)}\n`, 'utf8');
    await rename(temporary, this.file);
  }
}
