import { randomUUID } from "crypto";
import { useJsonStore } from "./config";
import { hashPassword, verifyPassword } from "./crypto";
import { getSql } from "./db";
import { readJsonStore } from "./store-json";

function envAdmin() {
  const email = (process.env.ADMIN_EMAIL || "").trim().replace(/^['"]|['"]$/g, "").toLowerCase();
  const password = (process.env.ADMIN_PASSWORD || "").trim().replace(/^['"]|['"]$/g, "");
  return { email, password };
}

export async function authenticateLogin(email: string, password: string) {
  const normalised = email.trim().toLowerCase();
  if (useJsonStore()) {
    const store = await readJsonStore();
    const user = store.profiles.find((p) => p.email.toLowerCase() === normalised);
    if (!user || !verifyPassword(password, user.passwordHash)) return null;
    return { id: user.id, role: user.role };
  }

  const sql = getSql();
  const admin = envAdmin();

  if (admin.email && admin.password && normalised === admin.email) {
    const existing = await sql`
      select id, password_hash, role from profiles where lower(email) = ${normalised} limit 1
    `;
    if (!existing.length) {
      if (password !== admin.password) return null;
      const id = randomUUID();
      await sql`
        insert into profiles (id, organization_id, role, name, email, password_hash, created_at)
        values (
          ${id}::uuid, null, 'super_admin', 'Platform Admin', ${normalised},
          ${hashPassword(admin.password)}, ${new Date().toISOString()}
        )
      `;
      return { id, role: "super_admin" as const };
    }
    const row = existing[0];
    const hash = String(row.password_hash || "");
    const matchesHash = verifyPassword(password, hash);
    const matchesEnv = password === admin.password;
    if (!matchesHash && !matchesEnv) return null;
    if (matchesEnv && !matchesHash) {
      await sql`update profiles set password_hash = ${hashPassword(admin.password)} where id = ${String(row.id)}::uuid`;
    }
    return { id: String(row.id), role: String(row.role || "super_admin") };
  }

  const rows = await sql`
    select id, password_hash, role from profiles where lower(email) = ${normalised} limit 1
  `;
  const row = rows[0];
  if (!row || !verifyPassword(password, String(row.password_hash || ""))) return null;
  return { id: String(row.id), role: String(row.role || "clinic_owner") };
}
