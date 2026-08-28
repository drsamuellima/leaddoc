import postgres from "postgres";

let client: ReturnType<typeof postgres> | null = null;

function normalizeDatabaseUrl(raw: string) {
  let url = raw.trim().replace(/^['"]|['"]$/g, "");
  if (!url) return url;
  const supabase = /supabase\.(co|com)|pooler\.supabase/i.test(url);
  const join = url.includes("?") ? "&" : "?";
  if (supabase && !/[?&]sslmode=/i.test(url)) {
    url += `${join}sslmode=require`;
  }
  if (supabase && !/[?&]pgbouncer=/i.test(url)) {
    url += `${url.includes("?") ? "&" : "?"}pgbouncer=true`;
  }
  return url;
}

export function resetSql() {
  if (!client) return;
  const current = client;
  client = null;
  void current.end({ timeout: 1 }).catch(() => undefined);
}

export function getSql() {
  if (client) return client;
  const url = normalizeDatabaseUrl(process.env.DATABASE_URL || "");
  if (!url) throw new Error("DATABASE_URL is not set. Apply supabase/schema.sql and set DATABASE_URL, or set USE_JSON_STORE=1 for local demo.");
  const supabase = /supabase\.(co|com)|pooler\.supabase/i.test(url);
  client = postgres(url, {
    max: 1,
    idle_timeout: 10,
    connect_timeout: 5,
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
