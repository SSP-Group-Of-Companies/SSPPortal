import connectDB from "@/lib/db";
import App, { AppDoc } from "@/models/App";
import type { UserDoc } from "@/models/User";
import { isAdminRole } from "@/lib/platform/constants";

export interface ResolvedApp {
  key: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  departmentCode: string;
  status: string;
  restricted: boolean;
  sortOrder: number;
  /** Whether this user can open the app right now. */
  hasAccess: boolean;
  /** Why access was granted — useful for admin debugging and the UI. */
  accessVia: "open" | "role" | "grant" | null;
}

/**
 * Access policy, evaluated in order:
 *  1. unrestricted apps are open to every active employee
 *  2. portal admins/superadmins can open everything (they govern the platform)
 *  3. a direct grant in the user directory (appKeys) — set via the admin
 *     console (approve request, manual grant, or bulk "Import from Entra")
 */
export function computeAccess(app: AppDoc, user: Pick<UserDoc, "role" | "appKeys">): ResolvedApp["accessVia"] {
  if (!app.restricted) return "open";
  if (isAdminRole(user.role)) return "role";
  if ((user.appKeys ?? []).includes(app.key)) return "grant";
  return null;
}

/** Resolve the full catalogue (minus archived apps) against one user. */
export async function resolveAppsForUser(user: UserDoc): Promise<ResolvedApp[]> {
  await connectDB();
  const apps = await App.find({ status: { $ne: "archived" } }).sort({ sortOrder: 1, name: 1 }).lean<AppDoc[]>();

  return apps.map((app) => {
    const via = computeAccess(app, user);
    return {
      key: app.key,
      name: app.name,
      description: app.description ?? "",
      url: app.url ?? "",
      icon: app.icon ?? "AppWindow",
      departmentCode: app.departmentCode ?? "",
      status: app.status,
      restricted: app.restricted,
      sortOrder: app.sortOrder ?? 100,
      hasAccess: via !== null,
      accessVia: via,
    };
  });
}

/** Keys of the apps the user can open — embedded in /api/v1/auth/me. */
export async function resolveAppKeysForUser(user: UserDoc): Promise<string[]> {
  const resolved = await resolveAppsForUser(user);
  return resolved.filter((a) => a.hasAccess).map((a) => a.key);
}
