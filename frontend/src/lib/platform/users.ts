import connectDB from "@/lib/db";
import User, { UserDoc } from "@/models/User";
import { logAudit } from "@/lib/platform/audit";
import { ADMIN_EMAILS } from "@/app/config/env";
import type { PortalRole, UserStatus } from "@/lib/platform/constants";

function bootstrapSuperadmins(): Set<string> {
  return new Set(
    ADMIN_EMAILS.split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export interface ProvisionInput {
  azureId: string;
  email: string;
  name?: string;
  image?: string;
  /** Entra security-group Object IDs from the ID token's `groups` claim. */
  entraGroups?: string[];
}

/**
 * Ensure a directory record exists for a signed-in Microsoft account and
 * return it. Runs on every sign-in: creates the user on first login,
 * refreshes profile fields and group memberships on every login.
 *
 * Bootstrap: emails in ADMIN_EMAILS are promoted to superadmin so the very
 * first operators can reach the admin console; from then on all role
 * management happens in the console (bootstrap never demotes anyone).
 */
export async function provisionUser(input: ProvisionInput): Promise<UserDoc> {
  await connectDB();

  const email = input.email.toLowerCase().trim();
  const isBootstrapSuperadmin = bootstrapSuperadmins().has(email);

  let existing = await User.findOne({ azureId: input.azureId });

  // Reconcile by email when the azureId doesn't match: this happens when a
  // record was created from an opaque `sub` (e.g. a pre-launch session, or
  // a self-heal that ran before a real `oid` was available) and the user
  // then signs in fresh with their canonical Azure object id. Email is the
  // durable human identity here, so we relink the record to the new azureId
  // instead of creating a duplicate that would collide on the unique email
  // index.
  if (!existing) {
    const byEmail = await User.findOne({ email });
    if (byEmail && byEmail.azureId !== input.azureId) {
      byEmail.azureId = input.azureId;
      existing = byEmail;
      await logAudit({
        action: "user.provisioned",
        actorEmail: email,
        targetType: "user",
        targetId: byEmail._id.toString(),
        targetLabel: email,
        meta: { reconciledAzureId: true },
      });
    }
  }

  if (!existing) {
    const created = await User.create({
      azureId: input.azureId,
      email,
      name: input.name ?? "",
      image: input.image ?? "",
      role: isBootstrapSuperadmin ? "superadmin" : "member",
      status: "active",
      entraGroups: input.entraGroups ?? [],
      lastLoginAt: new Date(),
    });
    await logAudit({
      action: "user.provisioned",
      actorEmail: email,
      targetType: "user",
      targetId: created._id.toString(),
      targetLabel: email,
      meta: { role: created.role },
    });
    return created;
  }

  existing.name = input.name || existing.name;
  existing.image = input.image || existing.image;
  existing.email = email;
  if (input.entraGroups) existing.entraGroups = input.entraGroups;
  if (isBootstrapSuperadmin && existing.role !== "superadmin") {
    existing.role = "superadmin";
  }
  existing.lastLoginAt = new Date();
  await existing.save();
  return existing;
}

export async function getUserByAzureId(azureId: string): Promise<UserDoc | null> {
  await connectDB();
  return User.findOne({ azureId });
}

export async function getUserByEmail(email: string): Promise<UserDoc | null> {
  await connectDB();
  return User.findOne({ email: email.toLowerCase().trim() });
}

/** Minimal claims embedded in the shared JWT so subapps get them for free. */
export interface UserClaims {
  uid: string;
  role: PortalRole;
  status: UserStatus;
  companyCode: string;
  departmentCode: string;
}

export function toClaims(user: UserDoc): UserClaims {
  return {
    uid: user._id.toString(),
    role: user.role as PortalRole,
    status: user.status as UserStatus,
    companyCode: user.companyCode ?? "",
    departmentCode: user.departmentCode ?? "",
  };
}
