import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { AUTH_COOKIE_NAME, NEXTAUTH_SECRET } from "@/app/config/env";
import { getUserByAzureId } from "@/lib/platform/users";
import { isAdminRole } from "@/lib/platform/constants";
import type { UserDoc } from "@/models/User";

export interface AuthedContext {
  user: UserDoc;
  /** Azure object id from the session token. */
  azureId: string;
}

type GuardResult = { ok: true; ctx: AuthedContext } | { ok: false; res: NextResponse };

export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** Resolve the shared session cookie to an active directory user. */
export async function requireUser(req: NextRequest): Promise<GuardResult> {
  const token = await getToken({ req, secret: NEXTAUTH_SECRET, cookieName: AUTH_COOKIE_NAME });
  if (!token) return { ok: false, res: jsonError(401, "Not authenticated") };

  const azureId = (typeof token.userId === "string" && token.userId) || token.sub || "";
  if (!azureId) return { ok: false, res: jsonError(401, "Invalid session") };

  const user = await getUserByAzureId(azureId);
  if (!user) return { ok: false, res: jsonError(401, "User not provisioned") };
  if (user.status === "disabled") return { ok: false, res: jsonError(403, "Account disabled") };

  return { ok: true, ctx: { user, azureId } };
}

/** Same as requireUser, plus portal admin or superadmin role. */
export async function requireAdmin(req: NextRequest): Promise<GuardResult> {
  const result = await requireUser(req);
  if (!result.ok) return result;
  if (!isAdminRole(result.ctx.user.role)) {
    return { ok: false, res: jsonError(403, "Admin access required") };
  }
  return result;
}

/** Superadmin only (role changes, seeding, company management). */
export async function requireSuperadmin(req: NextRequest): Promise<GuardResult> {
  const result = await requireUser(req);
  if (!result.ok) return result;
  if (result.ctx.user.role !== "superadmin") {
    return { ok: false, res: jsonError(403, "Superadmin access required") };
  }
  return result;
}
