import mongoose, { Schema, Model, InferSchemaType } from "mongoose";
import { PORTAL_ROLES, USER_STATUSES } from "@/lib/platform/constants";

/**
 * User Directory — auto-provisioned on first Microsoft sign-in.
 * This is the platform source of truth for who a person is, what role they
 * hold, and which apps they can reach. Subapps consume it via /api/v1/auth/me.
 */
const UserSchema = new Schema(
  {
    // Entra object id (token `oid`/`sub`) — the immutable identity key.
    azureId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, trim: true, default: "" },
    image: { type: String, default: "" },
    role: { type: String, enum: PORTAL_ROLES, default: "member" },
    status: { type: String, enum: USER_STATUSES, default: "active" },
    companyCode: { type: String, lowercase: true, trim: true, default: "" },
    departmentCode: { type: String, lowercase: true, trim: true, default: "" },
    // Direct per-app grants (App.key values) managed in the admin console.
    appKeys: { type: [String], default: [] },
    // Entra security-group Object IDs from the latest token (group claims).
    entraGroups: { type: [String], default: [] },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };

const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) || mongoose.model<UserDoc>("User", UserSchema);

export default User;
