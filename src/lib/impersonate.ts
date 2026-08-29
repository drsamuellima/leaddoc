import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cookieBase, getSessionUser, IMPERSONATE_COOKIE } from "./auth";
import { signValue } from "./crypto";
import { originFromRequest } from "./integrations";
import { appendAuditLog, getOrganizationById } from "./store";

export function clinicAppPath(raw: string) {
  const next = String(raw || "").trim();
  if (!next.startsWith("/app")) return "/app";
  if (next.startsWith("//") || /[\s\\]/.test(next)) return "/app";
  return next;
}

function impersonateCookie(organizationId: string) {
  return {
    name: IMPERSONATE_COOKIE,
    value: signValue(organizationId),
    ...cookieBase(),
    maxAge: 60 * 60 * 24 * 30,
  } as const;
}

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, originFromRequest(request)), 303);
}

async function note(actorId: string, action: string, organizationId: string | null, detail: string) {
  try {
    await appendAuditLog({
      id: randomUUID(),
      actorId,
      action,
      organizationId,
      detail,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // Opening a clinic must not depend on the audit write.
  }
}

export async function enterClinicResponse(request: Request, formData: FormData) {
  const user = await getSessionUser();
  if (!user) return redirectTo(request, "/login");
  if (user.role !== "super_admin") return redirectTo(request, "/app");

  const organizationId = String(formData.get("organizationId") || "");
  const org = await getOrganizationById(organizationId);
  if (!org) return redirectTo(request, "/admin?error=missing");

  const res = redirectTo(request, clinicAppPath(String(formData.get("next") || "/app")));
  const cookie = impersonateCookie(organizationId);
  res.cookies.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    path: cookie.path,
    secure: cookie.secure,
    maxAge: cookie.maxAge,
  });
  await note(user.id, "impersonate", organizationId, `${user.email} opened ${org.name}`);
  return res;
}

export async function exitClinicResponse(request: Request) {
  const user = await getSessionUser();
  if (!user) return redirectTo(request, "/login");
  if (user.role !== "super_admin") return redirectTo(request, "/app");

  const res = redirectTo(request, "/admin");
  res.cookies.set(IMPERSONATE_COOKIE, "", { ...cookieBase(), maxAge: 0 });
  return res;
}

export async function enterClinicAt(request: Request, organizationId: string, path: string) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") return redirectTo(request, "/login");
  const org = await getOrganizationById(organizationId);
  if (!org) return redirectTo(request, "/admin?error=missing");
  const res = redirectTo(request, clinicAppPath(path));
  const cookie = impersonateCookie(organizationId);
  res.cookies.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    path: cookie.path,
    secure: cookie.secure,
    maxAge: cookie.maxAge,
  });
  return res;
}
