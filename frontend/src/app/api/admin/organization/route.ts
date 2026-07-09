export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireSuperadmin, jsonError } from "@/lib/platform/apiGuard";
import connectDB from "@/lib/db";
import Company from "@/models/Company";
import Department from "@/models/Department";
import { logAudit } from "@/lib/platform/audit";

/** GET /api/admin/organization — companies and departments in one call. */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  await connectDB();
  const [companies, departments] = await Promise.all([
    Company.find().sort({ name: 1 }).lean(),
    Department.find().sort({ name: 1 }).lean(),
  ]);

  return NextResponse.json({
    companies: companies.map((c) => ({
      id: c._id.toString(),
      code: c.code,
      name: c.name,
      legalName: c.legalName ?? "",
      country: c.country,
      isActive: c.isActive,
    })),
    departments: departments.map((d) => ({
      id: d._id.toString(),
      code: d.code,
      name: d.name,
      description: d.description ?? "",
      isActive: d.isActive,
    })),
  });
}

/**
 * POST /api/admin/organization — create a company or a department.
 * Body: { type: "company" | "department", code, name, ... }
 * Companies are the top of the hierarchy, so creation is superadmin-only.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const type = String(body.type ?? "");
  const guard = type === "company" ? await requireSuperadmin(req) : await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const actor = guard.ctx.user;

  const code = String(body.code ?? "").toLowerCase().trim();
  const name = String(body.name ?? "").trim();
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(code)) {
    return jsonError(400, "code must be lowercase letters, digits and hyphens (2-41 chars)");
  }
  if (!name) return jsonError(400, "name is required");

  await connectDB();

  if (type === "company") {
    if (await Company.exists({ code })) return jsonError(409, "A company with this code already exists");
    const company = await Company.create({
      code,
      name,
      legalName: String(body.legalName ?? "").trim(),
      country: body.country === "US" ? "US" : "CA",
    });
    await logAudit({
      action: "company.created",
      actorEmail: actor.email,
      targetType: "company",
      targetId: company._id.toString(),
      targetLabel: company.code,
    });
    return NextResponse.json({ ok: true, id: company._id.toString() }, { status: 201 });
  }

  if (type === "department") {
    if (await Department.exists({ code })) return jsonError(409, "A department with this code already exists");
    const department = await Department.create({
      code,
      name,
      description: String(body.description ?? "").trim(),
    });
    await logAudit({
      action: "department.created",
      actorEmail: actor.email,
      targetType: "department",
      targetId: department._id.toString(),
      targetLabel: department.code,
    });
    return NextResponse.json({ ok: true, id: department._id.toString() }, { status: 201 });
  }

  return jsonError(400, 'type must be "company" or "department"');
}
