export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/platform/apiGuard";
import connectDB from "@/lib/db";
import Company from "@/models/Company";
import Department from "@/models/Department";
import App from "@/models/App";
import { logAudit } from "@/lib/platform/audit";

/**
 * POST /api/admin/seed — idempotent platform bootstrap (superadmin only).
 *
 * Upserts the SSP operating companies, group departments, and the initial
 * app registry. Safe to run repeatedly: existing records are only created
 * if missing — nothing an admin has since edited is overwritten.
 */

const COMPANIES = [
  { code: "ssp-truckline", name: "SSP Truckline Inc", country: "CA" },
  { code: "ssp-trucklines", name: "SSP Trucklines Inc", country: "US" },
  { code: "nesh", name: "New England Steel Haulers", country: "US" },
  { code: "fellowstrans", name: "FellowsTrans Inc", country: "CA" },
  { code: "webfreight", name: "Web Freight Inc", country: "CA" },
];

const DEPARTMENTS = [
  { code: "safety", name: "Safety", description: "Driver compliance, onboarding, and safety operations" },
  { code: "hr", name: "Human Resources", description: "Employee records, hiring, and people operations" },
  { code: "accounting", name: "Accounting", description: "Finance, payroll, and reporting" },
  { code: "dispatch", name: "Dispatch", description: "Load planning and driver dispatch" },
  { code: "operations", name: "Operations", description: "Cross-company operations and equipment" },
  { code: "sales", name: "Sales", description: "Customer acquisition and account management" },
  { code: "it", name: "Software & IT", description: "Internal software platform and IT services" },
];

const APPS = [
  {
    key: "drivedock",
    name: "DriveDock",
    description: "Driver onboarding and hiring compliance system.",
    url: process.env.NEXT_PUBLIC_DRIVEDOCK_URL ?? "",
    icon: "Truck",
    departmentCode: "safety",
    status: "active",
    restricted: true,
    sortOrder: 10,
  },
  {
    key: "ssp-health",
    name: "SSP Health",
    description: "Operational health intelligence: expiries, compliance scores, and company health dashboards.",
    url: "",
    icon: "Activity",
    departmentCode: "operations",
    status: "coming_soon",
    restricted: true,
    sortOrder: 20,
  },
];

export async function POST(req: NextRequest) {
  const guard = await requireSuperadmin(req);
  if (!guard.ok) return guard.res;
  const actor = guard.ctx.user;

  await connectDB();
  const created = { companies: 0, departments: 0, apps: 0 };

  for (const c of COMPANIES) {
    const res = await Company.updateOne({ code: c.code }, { $setOnInsert: c }, { upsert: true });
    if (res.upsertedCount) created.companies++;
  }
  for (const d of DEPARTMENTS) {
    const res = await Department.updateOne({ code: d.code }, { $setOnInsert: d }, { upsert: true });
    if (res.upsertedCount) created.departments++;
  }
  for (const a of APPS) {
    const res = await App.updateOne({ key: a.key }, { $setOnInsert: a }, { upsert: true });
    if (res.upsertedCount) created.apps++;
  }

  await logAudit({
    action: "platform.seeded",
    actorEmail: actor.email,
    targetType: "platform",
    meta: created,
  });

  return NextResponse.json({ ok: true, created });
}
