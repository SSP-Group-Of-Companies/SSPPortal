export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, jsonError } from "@/lib/platform/apiGuard";
import connectDB from "@/lib/db";
import App from "@/models/App";
import { logAudit } from "@/lib/platform/audit";
import { APP_STATUSES, type AppStatus } from "@/lib/platform/constants";

function serializeApp(a: InstanceType<typeof App> | Record<string, unknown>) {
  const app = a as Record<string, unknown> & { _id: { toString(): string } };
  return {
    id: app._id.toString(),
    key: app.key,
    name: app.name,
    description: app.description,
    url: app.url,
    icon: app.icon,
    departmentCode: app.departmentCode,
    status: app.status,
    entraGroupId: app.entraGroupId,
    restricted: app.restricted,
    sortOrder: app.sortOrder,
  };
}

/** GET /api/admin/apps — the full app registry, including archived apps. */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  await connectDB();
  const apps = await App.find().sort({ sortOrder: 1, name: 1 }).lean();
  return NextResponse.json({ apps: apps.map(serializeApp) });
}

/** POST /api/admin/apps — register a new application. */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const actor = guard.ctx.user;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const key = String(body.key ?? "").toLowerCase().trim();
  const name = String(body.name ?? "").trim();
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(key)) {
    return jsonError(400, "key must be lowercase letters, digits and hyphens (2-41 chars)");
  }
  if (!name) return jsonError(400, "name is required");

  const status = String(body.status ?? "active") as AppStatus;
  if (!APP_STATUSES.includes(status)) return jsonError(400, "Invalid status");

  await connectDB();
  if (await App.exists({ key })) return jsonError(409, "An app with this key already exists");

  const app = await App.create({
    key,
    name,
    description: String(body.description ?? "").trim(),
    url: String(body.url ?? "").trim(),
    icon: String(body.icon ?? "AppWindow").trim() || "AppWindow",
    departmentCode: String(body.departmentCode ?? "").toLowerCase().trim(),
    status,
    entraGroupId: String(body.entraGroupId ?? "").trim(),
    restricted: body.restricted !== false,
    sortOrder: Number(body.sortOrder ?? 100) || 100,
  });

  await logAudit({
    action: "app.created",
    actorEmail: actor.email,
    targetType: "app",
    targetId: app._id.toString(),
    targetLabel: app.key,
  });

  return NextResponse.json({ ok: true, app: serializeApp(app.toObject()) }, { status: 201 });
}
