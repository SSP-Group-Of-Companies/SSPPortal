import connectDB from "@/lib/db";
import AuditLog from "@/models/AuditLog";
import type { AuditAction } from "@/lib/platform/constants";

interface AuditEntry {
  action: AuditAction;
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  meta?: Record<string, unknown>;
}

/**
 * Write an audit entry. Auditing must never take the platform down, so
 * failures are logged and swallowed.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      action: entry.action,
      actorEmail: entry.actorEmail ?? "system",
      targetType: entry.targetType ?? "",
      targetId: entry.targetId ?? "",
      targetLabel: entry.targetLabel ?? "",
      meta: entry.meta ?? {},
    });
  } catch (err) {
    console.error("[audit] failed to write audit log:", err);
  }
}
