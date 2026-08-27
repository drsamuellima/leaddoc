import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export const uploadsDir = path.join(process.cwd(), ".data", "uploads");

const namePattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export function isSafeUploadName(name: string) {
  return namePattern.test(name) && !name.includes("..");
}

export async function saveUpload(filename: string, bytes: Buffer) {
  if (!isSafeUploadName(filename)) throw new Error("Invalid filename");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), bytes);
}

export async function readUpload(filename: string) {
  if (!isSafeUploadName(filename)) return null;
  try {
    return await readFile(path.join(uploadsDir, filename));
  } catch {
    return null;
  }
}

export function publicUploadUrl(filename: string) {
  return `/api/uploads/${encodeURIComponent(filename)}`;
}
