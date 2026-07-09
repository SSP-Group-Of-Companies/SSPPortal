import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

/**
 * Operating company under SSP Group (e.g. SSP Truckline Inc, Web Freight Inc).
 * Platform-owned: subapps reference companies by `code`, never redefine them.
 */
const CompanySchema = new Schema(
  {
    // Stable machine key used across the ecosystem (e.g. "ssp-truckline").
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    legalName: { type: String, trim: true },
    country: { type: String, enum: ["CA", "US"], default: "CA" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type CompanyDoc = InferSchemaType<typeof CompanySchema> & { _id: mongoose.Types.ObjectId };

const Company: Model<CompanyDoc> =
  (mongoose.models.Company as Model<CompanyDoc>) || mongoose.model<CompanyDoc>("Company", CompanySchema);

export default Company;
