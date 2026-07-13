export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/platform/apiGuard";
import connectDB from "@/lib/db";
import App from "@/models/App";
import AccessRequest from "@/models/AccessRequest";
import { computeAccess } from "@/lib/platform/access";
import { logAudit } from "@/lib/platform/audit";

/** POST /api/portal/access-requests — employee asks for access to an app. */
export async function POST(req: NextRequest) {
  const guard = await requireUser(req);
  if (!guard.ok) return guard.res;
  const { user } = guard.ctx;

  let body: { appKey?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const appKey = (body.appKey ?? "").toLowerCase().trim();
  if (!appKey) return jsonError(400, "appKey is required");

  await connectDB();
  const app = await App.findOne({ key: appKey, status: { $ne: "archived" } });
  if (!app) return jsonError(404, "App not found");

  if (computeAccess(app, user) !== null) {
    return jsonError(409, "You already have access to this app");
  }

  const existing = await AccessRequest.findOne({ userId: user._id, appKey, status: "pending" });
  if (existing) return jsonError(409, "You already have a pending request for this app");

  const request = await AccessRequest.create({
    userId: user._id,
    userEmail: user.email,
    userName: user.name,
    appKey,
    message: (body.message ?? "").slice(0, 500),
  });

  await logAudit({
    action: "access_request.created",
    actorEmail: user.email,
    targetType: "access_request",
    targetId: request._id.toString(),
    targetLabel: `${user.email} → ${appKey}`,
  });

  return NextResponse.json({ ok: true, id: request._id.toString() }, { status: 201 });
}

/** GET /api/portal/access-requests — the caller's own request history. */
export async function GET(req: NextRequest) {
  const guard = await requireUser(req);
  if (!guard.ok) return guard.res;

  await connectDB();
  const requests = await AccessRequest.find({ userId: guard.ctx.user._id }).sort({ createdAt: -1 }).limit(50).lean();

  return NextResponse.json({
    requests: requests.map((r) => ({
      id: r._id.toString(),
      appKey: r.appKey,
      status: r.status,
      message: r.message,
      decisionNote: r.decisionNote,
      createdAt: r.createdAt,
      decidedAt: r.decidedAt ?? null,
    })),
  });
}
