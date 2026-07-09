import mongoose, { Schema, Model, InferSchemaType } from "mongoose";
import { APP_STATUSES } from "@/lib/platform/constants";

/**
 * App Registry — the platform-owned catalogue of every internal application.
 * The dashboard launcher, the sidebar, and subapp access checks are all
 * driven from this collection; nothing is hardcoded in the UI.
 */
const AppSchema = new Schema(
  {
    // Stable machine key, referenced by grants and subapps (e.g. "drivedock").
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    url: { type: String, trim: true, default: "" },
    // lucide-react icon name rendered by the launcher (e.g. "Truck").
    icon: { type: String, trim: true, default: "AppWindow" },
    // Owning department code (matches Department.code) for sidebar grouping.
    departmentCode: { type: String, lowercase: true, trim: true, default: "" },
    status: { type: String, enum: APP_STATUSES, default: "active" },
    // Microsoft Entra security group Object ID mapped to this app
    // (e.g. SSP-App-DriveDock). Group membership grants access automatically.
    entraGroupId: { type: String, trim: true, default: "" },
    // When false the app is visible to every signed-in employee (no grant needed).
    restricted: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 100 },
  },
  { timestamps: true }
);

export type AppDoc = InferSchemaType<typeof AppSchema> & { _id: mongoose.Types.ObjectId };

const App: Model<AppDoc> =
  (mongoose.models.App as Model<AppDoc>) || mongoose.model<AppDoc>("App", AppSchema);

export default App;
