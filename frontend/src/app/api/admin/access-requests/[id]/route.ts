export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdmin, jsonError } from "@/lib/platform/apiGuard";
import connectDB from "@/lib/db";
import AccessRequest from "@/models/AccessRequest";
import User from "@/models/User";
import { logAudit } from "@/lib/platform/audit";

/**
 * PATCH /api/admin/access-requests/:id — approve or deny.
 * Approval writes the direct app grant onto the user in the same operation.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const actor = guard.ctx.user;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return jsonError(400, "Invalid request id");

  let body: { decision?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const decision = body.decision;
  if (decision !== "approved" && decision !== "denied") {
    return jsonError(400, 'decision must be "approved" or "denied"');
  }

  await connectDB();
  const request = await AccessRequest.findById(id);
  if (!request) return jsonError(404, "Request not found");
  if (request.status !== "pending") return jsonError(409, "Request already decided");

  request.status = decision;
  request.decidedByEmail = actor.email;
  request.decidedAt = new Date();
  request.decisionNote = (body.note ?? "").slice(0, 500);
  await request.save();

  if (decision === "approved") {
    await User.updateOne({ _id: request.userId }, { $addToSet: { appKeys: request.appKey } });
    await logAudit({
      action: "user.apps_changed",
      actorEmail: actor.email,
      targetType: "user",
      targetId: request.userId.toString(),
      targetLabel: request.userEmail,
      meta: { granted: request.appKey, via: "access_request" },
    });
  }

  await logAudit({
    action: decision === "approved" ? "access_request.approved" : "access_request.denied",
    actorEmail: actor.email,
    targetType: "access_request",
    targetId: request._id.toString(),
    targetLabel: `${request.userEmail} → ${request.appKey}`,
    meta: { note: request.decisionNote },
  });

  return NextResponse.json({ ok: true });
}
