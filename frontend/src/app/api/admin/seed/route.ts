export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/platform/apiGuard";
import connectDB from "@/lib/db";
import Company from "@/models/Company";
import Department from "@/models/Department";
import App from "@/models/App";
import User from "@/models/User";
import { logAudit } from "@/lib/platform/audit";

/**
 * POST /api/admin/seed — idempotent platform bootstrap (superadmin only).
 *
 * Intended for new-environment setup (local dev, staging, fresh production
 * database). Call it with a superadmin session cookie from a deploy script
 * or one-time curl — NOT exposed in the admin UI.
 *
 * Example (with a valid superadmin cookie):
 *   curl -X POST https://www.ssp4you.com/api/admin/seed \
 *        -H "Cookie: <AUTH_COOKIE_NAME>=<token>"
 *
 * Upserts the SSP operating companies, group departments, and the initial
 * app registry. Safe to run repeatedly: existing records are only created
 * if missing — nothing an admin has since edited is overwritten.
 */

/**
 * Canonical company codes — unified with DriveDock's production slugs
 * (stored in every OnboardingTracker) so the whole ecosystem shares one
 * vocabulary and no integration ever needs a mapping table.
 */
const COMPANIES = [
  { code: "ssp-ca", name: "SSP Truckline Inc", country: "CA" },
  { code: "ssp-us", name: "SSP Trucklines Inc", country: "US" },
  { code: "nesh", name: "New England Steel Haulers Inc", country: "CA" },
  { code: "fellowtrans", name: "FellowsTrans Inc", country: "CA" },
  { code: "webfreight", name: "Web Freight Inc", country: "CA" },
];

/** One-time migration: early portal codes → canonical DriveDock slugs. */
const LEGACY_CODE_MIGRATIONS: Record<string, string> = {
  "ssp-truckline": "ssp-ca",
  "ssp-trucklines": "ssp-us",
  fellowstrans: "fellowtrans",
};

const DEPARTMENTS = [
  { code: "safety", name: "Safety", description: "Driver compliance, onboarding, and safety operations" },
  { code: "hr", name: "Human Resources", description: "Employee records, hiring, and people operations" },
  { code: "accounting", name: "Accounting", description: "Finance, payroll, and reporting" },
  { code: "dispatch", name: "Dispatch", description: "Load planning and driver dispatch" },
  { code: "operations", name: "Operations", description: "Cross-company operations and equipment" },
  { code: "sales", name: "Sales", description: "Customer acquisition and account management" },
  { code: "software", name: "Software", description: "Internal software engineering and product" },
  { code: "it", name: "IT", description: "Infrastructure, identity, and IT support" },
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
  const migrated = { companies: 0, users: 0 };

  // Migrate legacy company codes to the canonical (DriveDock-aligned) slugs
  // before upserting, so re-running the seed converges instead of duplicating.
  for (const [oldCode, newCode] of Object.entries(LEGACY_CODE_MIGRATIONS)) {
    const clash = await Company.exists({ code: newCode });
    const legacy = await Company.findOne({ code: oldCode });
    if (legacy) {
      if (clash) {
        // Both exist (shouldn't happen) — drop the legacy row, keep canonical.
        await Company.deleteOne({ code: oldCode });
      } else {
        legacy.code = newCode;
        await legacy.save();
      }
      migrated.companies++;
    }
    const res = await User.updateMany({ companyCode: oldCode }, { $set: { companyCode: newCode } });
    migrated.users += res.modifiedCount;
  }

  for (const c of COMPANIES) {
    // Insert if missing; always sync canonical name/country from seed so factual
    // corrections (e.g. NESH is CA per DriveDock) propagate on re-run.
    const res = await Company.updateOne(
      { code: c.code },
      { $set: { name: c.name, country: c.country }, $setOnInsert: { code: c.code, isActive: true } },
      { upsert: true }
    );
    if (res.upsertedCount) created.companies++;
  }
  for (const d of DEPARTMENTS) {
    const res = await Department.updateOne(
      { code: d.code },
      {
        $set: { name: d.name, description: d.description },
        $setOnInsert: { code: d.code, isActive: true },
      },
      { upsert: true }
    );
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
    meta: { ...created, migrated },
  });

  return NextResponse.json({ ok: true, created, migrated });
}
