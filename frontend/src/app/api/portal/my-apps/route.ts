export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/platform/apiGuard";
import { resolveAppsForUser } from "@/lib/platform/access";
import connectDB from "@/lib/db";
import Department from "@/models/Department";
import AccessRequest from "@/models/AccessRequest";

/**
 * GET /api/portal/my-apps — everything the dashboard launcher and sidebar
 * need in one round trip: the catalogue resolved against the current user,
 * department labels for grouping, and the user's pending access requests.
 */
export async function GET(req: NextRequest) {
  const guard = await requireUser(req);
  if (!guard.ok) return guard.res;
  const { user } = guard.ctx;

  await connectDB();
  const [apps, departments, pending] = await Promise.all([
    resolveAppsForUser(user),
    Department.find({ isActive: true }).sort({ name: 1 }).lean(),
    AccessRequest.find({ userId: user._id, status: "pending" }).select("appKey").lean(),
  ]);

  return NextResponse.json({
    apps,
    departments: departments.map((d) => ({ code: d.code, name: d.name })),
    pendingRequests: pending.map((r) => r.appKey),
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      companyCode: user.companyCode,
      departmentCode: user.departmentCode,
    },
  });
}
