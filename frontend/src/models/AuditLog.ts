import mongoose, { Schema, Model, InferSchemaType } from "mongoose";
import { AUDIT_ACTIONS } from "@/lib/platform/constants";

/**
 * Immutable audit trail for every governance action on the platform:
 * sign-ins, role changes, app grants, registry edits, access decisions.
 */
const AuditLogSchema = new Schema(
  {
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    actorEmail: { type: String, lowercase: true, trim: true, default: "system" },
    targetType: { type: String, trim: true, default: "" }, // "user" | "app" | "company" | ...
    targetId: { type: String, trim: true, default: "" },
    targetLabel: { type: String, trim: true, default: "" },
    // Free-form details: { from, to, appKey, note... }
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ actorEmail: 1, createdAt: -1 });

export type AuditLogDoc = InferSchemaType<typeof AuditLogSchema> & { _id: mongoose.Types.ObjectId };

const AuditLog: Model<AuditLogDoc> =
  (mongoose.models.AuditLog as Model<AuditLogDoc>) || mongoose.model<AuditLogDoc>("AuditLog", AuditLogSchema);

export default AuditLog;
