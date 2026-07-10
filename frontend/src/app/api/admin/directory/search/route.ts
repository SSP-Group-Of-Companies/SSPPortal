export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, jsonError } from "@/lib/platform/apiGuard";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { listDirectoryUsers } from "@/lib/graph/client";

/**
 * GET /api/admin/directory/search?q= — browse or search the Entra tenant
 * (Microsoft Graph, app-only) for the "Import from Entra" tool. Results are
 * cross-referenced against the portal's own User directory so the admin can
 * see who is already provisioned, and with what access, before importing.
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();

  let graphUsers;
  try {
    graphUsers = await listDirectoryUsers(q);
  } catch (err) {
    console.error("[directory/search] Microsoft Graph call failed:", err);
    return jsonError(502, "Could not reach Microsoft Graph. Check API permissions and admin consent on the portal app registration.");
  }

  await connectDB();
  const azureIds = graphUsers.map((u) => u.azureId);
  const existing = await User.find({ azureId: { $in: azureIds } })
    .select("azureId role status appKeys")
    .lean();
  const byAzureId = new Map(existing.map((u) => [u.azureId, u]));

  return NextResponse.json({
    users: graphUsers.map((u) => {
      const rec = byAzureId.get(u.azureId);
      return {
        ...u,
        alreadyImported: Boolean(rec),
        role: rec?.role ?? null,
        status: rec?.status ?? null,
        appKeys: rec?.appKeys ?? [],
      };
    }),
  });
}
