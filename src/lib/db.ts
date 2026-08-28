import postgres from "postgres";

let client: ReturnType<typeof postgres> | null = null;

function normalizeDatabaseUrl(raw: string) {
  let url = raw.trim().replace(/^['"]|['"]$/g, "");
  if (!url) return url;
  const supabase = /supabase\.(co|com)|pooler\.supabase/i.test(url);
  if (supabase && !/[?&]sslmode=/i.test(url)) {
    url += `${url.includes("?") ? "&" : "?"}sslmode=require`;
  }
  return url;
}

export function getSql() {
  if (client) return client;
  const url = normalizeDatabaseUrl(process.env.DATABASE_URL || "");
  if (!url) throw new Error("DATABASE_URL is not set. Apply supabase/schema.sql and set DATABASE_URL, or set USE_JSON_STORE=1 for local demo.");
  const supabase = /supabase\.(co|com)|pooler\.supabase/i.test(url);
  client = postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
    ssl: supabase ? { rejectUnauthorized: false } : undefined,
  });
  return client;
}

export function pingDatabase() {
  return getSql()`select 1 as ok`;
}

// Transaction and root connections share the tagged-template API at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Tx = any;
