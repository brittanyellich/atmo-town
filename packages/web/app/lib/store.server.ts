import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type SimpleStore<V> = {
  get(key: string): Promise<V | undefined>;
  set(key: string, value: V): Promise<void>;
  del(key: string): Promise<void>;
};

export function memoryStore<V>(): SimpleStore<V> {
  const map = new Map<string, V>();
  return {
    async get(key) {
      return map.get(key);
    },
    async set(key, value) {
      map.set(key, value);
    },
    async del(key) {
      map.delete(key);
    },
  };
}

/**
 * A JSON file store so OAuth sessions survive dev server restarts.
 * Local development only: the file holds DPoP keys and tokens and is gitignored.
 * Replace with a database before deploying.
 */
export function jsonFileStore<V>(path: string): SimpleStore<V> {
  const read = (): Record<string, V> => {
    try {
      return JSON.parse(readFileSync(path, "utf8")) as Record<string, V>;
    } catch {
      return {};
    }
  };
  const write = (data: Record<string, V>) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(data), { mode: 0o600 });
  };
  return {
    async get(key) {
      return read()[key];
    },
    async set(key, value) {
      const data = read();
      data[key] = value;
      write(data);
    },
    async del(key) {
      const data = read();
      delete data[key];
      write(data);
    },
  };
}
