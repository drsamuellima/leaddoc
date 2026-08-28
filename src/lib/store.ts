import { useJsonStore } from "./config";
import { mutateJsonStore, readJsonStore, slugify, DEMO_WIDGET_KEY } from "./store-json";
import { getPgOrganizationById, getPgProfileById, mutatePgStore, readPgStore } from "./store-pg";
import type { Organization, Profile, StoreData } from "./types";

export { slugify, DEMO_WIDGET_KEY };

export async function readStore(): Promise<StoreData> {
  if (useJsonStore()) return readJsonStore();
  return readPgStore();
}

export async function mutateStore<T>(fn: (data: StoreData) => T | Promise<T>): Promise<T> {
  if (useJsonStore()) return mutateJsonStore(fn);
  return mutatePgStore(fn);
}

export async function getProfileById(id: string): Promise<Profile | null> {
  if (useJsonStore()) {
    const store = await readJsonStore();
    return store.profiles.find((p) => p.id === id) ?? null;
  }
  return getPgProfileById(id);
}

export async function getOrganizationById(id: string): Promise<Organization | null> {
  if (useJsonStore()) {
    const store = await readJsonStore();
    return store.organizations.find((o) => o.id === id) ?? null;
  }
  return getPgOrganizationById(id);
}
