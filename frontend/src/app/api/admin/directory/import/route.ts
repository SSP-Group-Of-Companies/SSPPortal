export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, jsonError } from "@/lib/platform/apiGuard";
import connectDB from "@/lib/db";
import User from "@/models/User";
import App from "@/models/App";
import Company from "@/models/Company";
import Department from "@/models/Department";
import { logAudit } from "@/lib/platform/audit";

interface ImportUser {
  azureId: string;
  email: string;
  name?: string;
}

interface ImportBody {
  users: ImportUser[];
  appKeys?: string[];
  companyCode?: string;
  departmentCode?: string;
}

/**
 * POST /api/admin/directory/import — pre-provision employees found via
 * Microsoft Graph and optionally grant them apps up front, so they don't
 * have to sign into the portal and request access before software/IT can
 * act on their behalf.
 *
 * Idempotent per user, and never destructive: an existing directory record
 * is only ever merged into (grants are added, never removed; org fields
 * are only set if supplied). Re-running an import is always safe.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const actor = guard.ctx.user;

  let body: ImportBody;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  if (!Array.isArray(body.users) || body.users.length === 0) {
    return jsonError(400, "users must be a non-empty array");
  }
  if (body.users.length > 200) {
    return jsonError(400, "Import at most 200 users at a time");
  }

  const appKeys = [...new Set((body.appKeys ?? []).map((k) => k.toLowerCase().trim()).filter(Boolean))];
  const companyCode = (body.companyCode ?? "").toLowerCase().trim();
  const departmentCode = (body.departmentCode ?? "").toLowerCase().trim();

  await connectDB();

  if (appKeys.length) {
    const validCount = await App.countDocuments({ key: { $in: appKeys } });
    if (validCount !== appKeys.length) return jsonError(400, "One or more app keys are unknown");
  }
  if (companyCode && !(await Company.exists({ code: companyCode }))) {
    return jsonError(400, "Unknown company code");
  }
  if (departmentCode && !(await Department.exists({ code: departmentCode }))) {
    return jsonError(400, "Unknown department code");
  }

  let created = 0;
  let updated = 0;

  for (const u of body.users) {
    const azureId = String(u.azureId ?? "").trim();
    const email = String(u.email ?? "").toLowerCase().trim();
    if (!azureId || !email) continue;

    const existing = await User.findOne({ azureId });

    if (!existing) {
      const doc = await User.create({
        azureId,
        email,
        name: (u.name ?? "").trim(),
        role: "member",
        status: "active",
        companyCode,
        departmentCode,
        appKeys,
      });
      created++;
      await logAudit({
        action: "user.imported",
        actorEmail: actor.email,
        targetType: "user",
        targetId: doc._id.toString(),
        targetLabel: email,
        meta: { appKeys, companyCode, departmentCode },
      });
      continue;
    }

    let changed = false;
    if (appKeys.length) {
      const before = new Set(existing.appKeys ?? []);
      const merged = new Set([...before, ...appKeys]);
      if (merged.size !== before.size) {
        existing.set("appKeys", [...merged]);
        changed = true;
      }
    }
    if (companyCode && existing.companyCode !== companyCode) {
      existing.companyCode = companyCode;
      changed = true;
    }
    if (departmentCode && existing.departmentCode !== departmentCode) {
      existing.departmentCode = departmentCode;
      changed = true;
    }
    if (changed) {
      await existing.save();
      updated++;
      await logAudit({
        action: "user.imported",
        actorEmail: actor.email,
        targetType: "user",
        targetId: existing._id.toString(),
        targetLabel: email,
        meta: { appKeys, companyCode, departmentCode, merged: true },
      });
    }
  }

  return NextResponse.json({ ok: true, created, updated, skipped: body.users.length - created - updated });
}
