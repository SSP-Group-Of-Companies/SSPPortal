export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdmin, jsonError } from "@/lib/platform/apiGuard";
import connectDB from "@/lib/db";
import User from "@/models/User";
import App from "@/models/App";
import Company from "@/models/Company";
import Department from "@/models/Department";
import { logAudit } from "@/lib/platform/audit";
import { PORTAL_ROLES, USER_STATUSES, type PortalRole, type UserStatus } from "@/lib/platform/constants";

interface PatchBody {
  role?: string;
  status?: string;
  companyCode?: string;
  departmentCode?: string;
  appKeys?: string[];
}

/**
 * PATCH /api/admin/users/:id — governance actions on a directory user.
 * Role changes are superadmin-only; nobody can demote or disable themselves.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const actor = guard.ctx.user;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return jsonError(400, "Invalid user id");

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  await connectDB();
  const target = await User.findById(id);
  if (!target) return jsonError(404, "User not found");

  const isSelf = target._id.equals(actor._id);
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  if (body.role !== undefined && body.role !== target.role) {
    if (actor.role !== "superadmin") return jsonError(403, "Only superadmins can change roles");
    if (isSelf) return jsonError(400, "You cannot change your own role");
    if (!PORTAL_ROLES.includes(body.role as PortalRole)) return jsonError(400, "Invalid role");
    changes.role = { from: target.role, to: body.role };
    target.role = body.role as PortalRole;
  }

  if (body.status !== undefined && body.status !== target.status) {
    if (isSelf) return jsonError(400, "You cannot disable your own account");
    if (!USER_STATUSES.includes(body.status as UserStatus)) return jsonError(400, "Invalid status");
    if (target.role === "superadmin" && actor.role !== "superadmin") {
      return jsonError(403, "Only superadmins can disable a superadmin");
    }
    changes.status = { from: target.status, to: body.status };
    target.status = body.status as UserStatus;
  }

  if (body.companyCode !== undefined && body.companyCode !== target.companyCode) {
    const code = body.companyCode.toLowerCase().trim();
    if (code && !(await Company.exists({ code }))) return jsonError(400, "Unknown company code");
    changes.companyCode = { from: target.companyCode, to: code };
    target.companyCode = code;
  }

  if (body.departmentCode !== undefined && body.departmentCode !== target.departmentCode) {
    const code = body.departmentCode.toLowerCase().trim();
    if (code && !(await Department.exists({ code }))) return jsonError(400, "Unknown department code");
    changes.departmentCode = { from: target.departmentCode, to: code };
    target.departmentCode = code;
  }

  if (body.appKeys !== undefined) {
    const requested = [...new Set(body.appKeys.map((k) => k.toLowerCase().trim()).filter(Boolean))];
    const validCount = await App.countDocuments({ key: { $in: requested } });
    if (validCount !== requested.length) return jsonError(400, "One or more app keys are unknown");
    const current = [...(target.appKeys ?? [])].sort();
    if (JSON.stringify(current) !== JSON.stringify([...requested].sort())) {
      changes.appKeys = { from: current, to: requested };
      target.set("appKeys", requested);
    }
  }

  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ ok: true, changed: false });
  }

  await target.save();

  const auditBase = {
    actorEmail: actor.email,
    targetType: "user",
    targetId: target._id.toString(),
    targetLabel: target.email,
  };
  if (changes.role) await logAudit({ ...auditBase, action: "user.role_changed", meta: changes.role });
  if (changes.status) await logAudit({ ...auditBase, action: "user.status_changed", meta: changes.status });
  if (changes.appKeys) await logAudit({ ...auditBase, action: "user.apps_changed", meta: changes.appKeys });
  if (changes.companyCode || changes.departmentCode) {
    await logAudit({
      ...auditBase,
      action: "user.org_changed",
      meta: { companyCode: changes.companyCode, departmentCode: changes.departmentCode },
    });
  }

  return NextResponse.json({ ok: true, changed: true });
}
