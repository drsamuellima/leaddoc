import dns from "node:dns";
import postgres from "postgres";

dns.setDefaultResultOrder("ipv4first");

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
  if (supabase && !/[?&]options=/i.test(url)) {
    url += `${url.includes("?") ? "&" : "?"}options=${encodeURIComponent("-c statement_timeout=8s")}`;
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
    idle_timeout: 5,
    max_lifetime: 60,
    connect_timeout: 8,
    prepare: false,
    fetch_types: false,
    ssl: supabase ? { rejectUnauthorized: false } : undefined,
    connection: {
      statement_timeout: 8000,
    },
    onclose() {
      client = null;
    },
  });
  return client;
}

export function pingDatabase() {
  return getSql()`select 1 as ok`;
}

export function withDbTimeout<T>(work: Promise<T>, ms = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resetSql();
      reject(new Error("database timeout"));
    }, ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// Transaction and root connections share the tagged-template API at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Tx = any;
