import { useJsonStore } from "./config";
import { mutateJsonStore, readJsonStore, slugify, DEMO_WIDGET_KEY } from "./store-json";
import { mutatePgStore, readPgStore } from "./store-pg";
import type { StoreData } from "./types";

export { slugify, DEMO_WIDGET_KEY };

export async function readStore(): Promise<StoreData> {
  if (useJsonStore()) return readJsonStore();
  return readPgStore();
}

export async function mutateStore<T>(fn: (data: StoreData) => T | Promise<T>): Promise<T> {
  if (useJsonStore()) return mutateJsonStore(fn);
  return mutatePgStore(fn);
}
