export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdmin, jsonError } from "@/lib/platform/apiGuard";
import connectDB from "@/lib/db";
import App from "@/models/App";
import { logAudit } from "@/lib/platform/audit";
import { APP_STATUSES, type AppStatus } from "@/lib/platform/constants";

/**
 * PATCH /api/admin/apps/:id — update a registry entry.
 * The `key` is immutable once created (grants and subapps reference it);
 * apps are archived, never deleted, so the audit trail stays coherent.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const actor = guard.ctx.user;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return jsonError(400, "Invalid app id");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  await connectDB();
  const app = await App.findById(id);
  if (!app) return jsonError(404, "App not found");

  const before = { status: app.status, restricted: app.restricted };

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return jsonError(400, "name cannot be empty");
    app.name = name;
  }
  if (body.description !== undefined) app.description = String(body.description).trim();
  if (body.url !== undefined) app.url = String(body.url).trim();
  if (body.icon !== undefined) app.icon = String(body.icon).trim() || "AppWindow";
  if (body.departmentCode !== undefined) app.departmentCode = String(body.departmentCode).toLowerCase().trim();
  if (body.restricted !== undefined) app.restricted = body.restricted !== false;
  if (body.sortOrder !== undefined) app.sortOrder = Number(body.sortOrder) || 100;
  if (body.status !== undefined) {
    const status = String(body.status);
    if (!APP_STATUSES.includes(status as AppStatus)) return jsonError(400, "Invalid status");
    app.status = status as AppStatus;
  }

  await app.save();

  await logAudit({
    action: app.status === "archived" && before.status !== "archived" ? "app.archived" : "app.updated",
    actorEmail: actor.email,
    targetType: "app",
    targetId: app._id.toString(),
    targetLabel: app.key,
    meta: { before, after: { status: app.status, restricted: app.restricted } },
  });

  return NextResponse.json({ ok: true });
}
