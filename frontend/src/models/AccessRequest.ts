import mongoose, { Schema, Model, InferSchemaType } from "mongoose";
import { ACCESS_REQUEST_STATUSES } from "@/lib/platform/constants";

/**
 * Self-service access request: an employee asks for an app they can see in the
 * catalogue but cannot open. Admins approve or deny from the admin console.
 */
const AccessRequestSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true },
    userName: { type: String, trim: true, default: "" },
    appKey: { type: String, required: true, lowercase: true, trim: true },
    message: { type: String, trim: true, default: "", maxlength: 500 },
    status: { type: String, enum: ACCESS_REQUEST_STATUSES, default: "pending" },
    decidedByEmail: { type: String, lowercase: true, trim: true, default: "" },
    decidedAt: { type: Date },
    decisionNote: { type: String, trim: true, default: "", maxlength: 500 },
  },
  { timestamps: true }
);

AccessRequestSchema.index({ status: 1, createdAt: -1 });
AccessRequestSchema.index({ userId: 1, appKey: 1, status: 1 });

export type AccessRequestDoc = InferSchemaType<typeof AccessRequestSchema> & { _id: mongoose.Types.ObjectId };

const AccessRequest: Model<AccessRequestDoc> =
  (mongoose.models.AccessRequest as Model<AccessRequestDoc>) ||
  mongoose.model<AccessRequestDoc>("AccessRequest", AccessRequestSchema);

export default AccessRequest;
