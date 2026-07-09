export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/platform/apiGuard";
import connectDB from "@/lib/db";
import AccessRequest from "@/models/AccessRequest";
import { ACCESS_REQUEST_STATUSES, type AccessRequestStatus } from "@/lib/platform/constants";

/** GET /api/admin/access-requests?status=pending — review queue. */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const filter: { status?: AccessRequestStatus } = {};
  if (ACCESS_REQUEST_STATUSES.includes(status as AccessRequestStatus)) {
    filter.status = status as AccessRequestStatus;
  }

  await connectDB();
  const requests = await AccessRequest.find(filter).sort({ createdAt: -1 }).limit(200).lean();

  return NextResponse.json({
    requests: requests.map((r) => ({
      id: r._id.toString(),
      userEmail: r.userEmail,
      userName: r.userName,
      appKey: r.appKey,
      message: r.message,
      status: r.status,
      decidedByEmail: r.decidedByEmail,
      decidedAt: r.decidedAt ?? null,
      decisionNote: r.decisionNote,
      createdAt: r.createdAt,
    })),
  });
}
