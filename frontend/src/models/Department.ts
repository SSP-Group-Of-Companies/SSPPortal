import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

/**
 * Group-level department (Safety, HR, Accounting…). Platform-owned:
 * subapps reference departments by `code` and never keep their own list.
 */
const DepartmentSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type DepartmentDoc = InferSchemaType<typeof DepartmentSchema> & { _id: mongoose.Types.ObjectId };

const Department: Model<DepartmentDoc> =
  (mongoose.models.Department as Model<DepartmentDoc>) || mongoose.model<DepartmentDoc>("Department", DepartmentSchema);

export default Department;
