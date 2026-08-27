#!/usr/bin/env node
/**
 * Fails if a Next.js page.tsx or route.ts under src/app has no matching
 * markdown heading in docs/. Headings must look like:
 *   ## /app/leads
 *   ## POST /api/widget/lead
 *   ## /w/[widgetKey]
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(root, "src", "app");
const docsDir = path.join(root, "docs");

const ROUTE_FILES = new Set(["page.tsx", "page.ts", "page.jsx", "page.js", "route.ts", "route.js"]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

function fileToRoute(absFile) {
  const rel = path.relative(appDir, absFile).split(path.sep).join("/");
  const stripped = rel.replace(/\/?(page|route)\.(tsx|ts|jsx|js)$/, "");
  return stripped ? `/${stripped}` : "/";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function headingFor(route) {
  return new RegExp(`^#{1,3}\\s+(?:GET|POST|PUT|PATCH|DELETE)\\s+${escapeRegExp(route)}\\s*$|^#{1,3}\\s+${escapeRegExp(route)}\\s*$`, "m");
}

async function loadDocs() {
  const files = (await walk(docsDir)).filter((f) => f.endsWith(".md"));
  const chunks = await Promise.all(files.map((f) => readFile(f, "utf8")));
  return chunks.join("\n");
}

const appFiles = (await walk(appDir)).filter((f) => ROUTE_FILES.has(path.basename(f)));
const routes = [...new Set(appFiles.map(fileToRoute))].sort();
const docs = await loadDocs();

const missing = routes.filter((route) => !headingFor(route).test(docs));

if (missing.length) {
  console.error("docs:check failed. Add a markdown heading for each route (e.g. ## /app/leads):\n");
  for (const route of missing) console.error(`  ${route}`);
  process.exit(1);
}

console.log(`docs:check ok (${routes.length} routes listed).`);
