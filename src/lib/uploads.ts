import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { allowDemoFallbacks } from "./config";

export const uploadsDir = path.join(process.cwd(), ".data", "uploads");
export const AVATAR_BUCKET = "avatars";

const namePattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

function supabaseUrl() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
}

function serviceRoleKey() {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
}

export function hasObjectStorage() {
  return Boolean(supabaseUrl() && serviceRoleKey());
}

export function isSafeUploadName(name: string) {
  return namePattern.test(name) && !name.includes("..");
}

export function publicUploadUrl(filename: string) {
  if (hasObjectStorage()) {
    return `${supabaseUrl()}/storage/v1/object/public/${AVATAR_BUCKET}/${encodeURIComponent(filename)}`;
  }
  return `/api/uploads/${encodeURIComponent(filename)}`;
}

async function saveToSupabase(filename: string, bytes: Buffer) {
  const res = await fetch(`${supabaseUrl()}/storage/v1/object/${AVATAR_BUCKET}/${filename}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey()}`,
      apikey: serviceRoleKey(),
      "Content-Type": "image/jpeg",
      "x-upsert": "true",
    },
    body: new Uint8Array(bytes),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(detail || "Upload failed");
  }
}

async function readFromSupabase(filename: string) {
  const res = await fetch(`${supabaseUrl()}/storage/v1/object/public/${AVATAR_BUCKET}/${filename}`);
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

export async function saveUpload(filename: string, bytes: Buffer) {
  if (!isSafeUploadName(filename)) throw new Error("Invalid filename");
  if (hasObjectStorage()) {
    await saveToSupabase(filename, bytes);
    return;
  }
  if (!allowDemoFallbacks()) throw new Error("File storage is not configured");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), bytes);
}

export async function readUpload(filename: string) {
  if (!isSafeUploadName(filename)) return null;
  if (hasObjectStorage()) return readFromSupabase(filename);
  try {
    return await readFile(path.join(uploadsDir, filename));
  } catch {
    return null;
  }
}
