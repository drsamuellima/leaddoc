import postgres from "postgres";

let client: ReturnType<typeof postgres> | null = null;

export function getSql() {
  if (client) return client;
  const url = (process.env.DATABASE_URL || "").trim();
  if (!url) throw new Error("DATABASE_URL is not set. Apply supabase/schema.sql and set DATABASE_URL, or set USE_JSON_STORE=1 for local demo.");
  client = postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  return client;
}

// Transaction and root connections share the tagged-template API at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Tx = any;
