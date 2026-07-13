export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/platform/apiGuard";
import { resolveAppKeysForUser } from "@/lib/platform/access";

/**
 * GET /api/v1/auth/me — the platform identity contract for subapps.
 *
 * A subapp (DriveDock, SSP Health, …) that holds the shared SSP session
 * cookie calls this endpoint (forwarding the cookie) to learn who the user
 * is and what they may access. Subapps must not build their own user store;
 * this response is the source of truth.
 *
 * Versioned: breaking changes go to /api/v2, never into this shape.
 */
export async function GET(req: NextRequest) {
  const guard = await requireUser(req);
  if (!guard.ok) return guard.res;

  const { user } = guard.ctx;
  const appKeys = await resolveAppKeysForUser(user);

  return NextResponse.json({
    v: 1,
    user: {
      id: user._id.toString(),
      azureId: user.azureId,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
      status: user.status,
      companyCode: user.companyCode,
      departmentCode: user.departmentCode,
    },
    access: {
      apps: appKeys,
    },
  });
}
