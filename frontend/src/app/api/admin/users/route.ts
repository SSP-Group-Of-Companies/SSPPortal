export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/platform/apiGuard";
import connectDB from "@/lib/db";
import User from "@/models/User";

/**
 * GET /api/admin/users?q=&page= — paginated user directory for the admin console.
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const { searchParams } = req.nextUrl;
  const q = (searchParams.get("q") ?? "").trim();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const pageSize = 25;

  await connectDB();
  const filter = q
    ? {
        $or: [
          { email: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
          { name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    User.countDocuments(filter),
  ]);

  return NextResponse.json({
    users: users.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      name: u.name,
      image: u.image,
      role: u.role,
      status: u.status,
      companyCode: u.companyCode,
      departmentCode: u.departmentCode,
      appKeys: u.appKeys ?? [],
      lastLoginAt: u.lastLoginAt ?? null,
      createdAt: u.createdAt,
    })),
    total,
    page,
    pageSize,
  });
}
