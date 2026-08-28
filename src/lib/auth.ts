import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSecureCookie } from "./config";
import { verifySignedValue, signValue } from "./crypto";
import { readStore } from "./store";
import type { Organization, Profile, Role } from "./types";

export const SESSION_COOKIE = "dentchat_session";
export const IMPERSONATE_COOKIE = "dentchat_impersonate_org";

function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: isSecureCookie(),
  };
}

export async function getSessionUser(): Promise<Profile | null> {
  const jar = await cookies();
  const id = verifySignedValue(jar.get(SESSION_COOKIE)?.value);
  if (!id) return null;
  const store = await readStore();
  return store.profiles.find((p) => p.id === id) ?? null;
}

export async function requireUser(): Promise<Profile> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<Profile> {
  const user = await requireUser();
  if (user.role !== "super_admin") redirect("/app");
  return user;
}

export async function getActiveOrgId(user: Profile): Promise<string | null> {
  const jar = await cookies();
  const impersonate = verifySignedValue(jar.get(IMPERSONATE_COOKIE)?.value);
  if (user.role === "super_admin" && impersonate) return impersonate;
  return user.organizationId;
}

export async function getClinicContext(): Promise<{
  user: Profile;
  org: Organization;
  impersonating: boolean;
}> {
  const user = await requireUser();
  if (user.role === "super_admin") {
    const orgId = await getActiveOrgId(user);
    if (!orgId) redirect("/admin");
    const store = await readStore();
    const org = store.organizations.find((o) => o.id === orgId);
    if (!org) redirect("/admin");
    return { user, org, impersonating: true };
  }
  if (!user.organizationId) redirect("/login");
  const store = await readStore();
  const org = store.organizations.find((o) => o.id === user.organizationId);
  if (!org) redirect("/login");
  return { user, org, impersonating: false };
}

export function canManageClinic(role: Role): boolean {
  return role === "super_admin" || role === "clinic_owner";
}

export async function setSession(userId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signValue(userId), {
    ...cookieBase(),
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function setImpersonate(organizationId: string) {
  const jar = await cookies();
  jar.set(IMPERSONATE_COOKIE, signValue(organizationId), cookieBase());
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(IMPERSONATE_COOKIE);
}
