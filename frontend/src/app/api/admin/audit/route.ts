export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/platform/apiGuard";
import connectDB from "@/lib/db";
import AuditLog from "@/models/AuditLog";
import { AUDIT_ACTIONS, type AuditAction } from "@/lib/platform/constants";

/** GET /api/admin/audit?action=&page= — paginated audit trail (read-only). */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const { searchParams } = req.nextUrl;
  const action = searchParams.get("action") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const pageSize = 50;

  const filter = AUDIT_ACTIONS.includes(action as AuditAction) ? { action: action as AuditAction } : {};

  await connectDB();
  const [entries, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e._id.toString(),
      action: e.action,
      actorEmail: e.actorEmail,
      targetType: e.targetType,
      targetLabel: e.targetLabel,
      meta: e.meta ?? {},
      createdAt: e.createdAt,
    })),
    total,
    page,
    pageSize,
  });
}
