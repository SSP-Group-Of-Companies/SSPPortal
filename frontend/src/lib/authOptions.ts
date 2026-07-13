import AzureADProvider from "next-auth/providers/azure-ad";
import type { AuthOptions } from "next-auth";
import {
  AZURE_AD_CLIENT_ID,
  AZURE_AD_CLIENT_SECRET,
  AZURE_AD_TENANT_ID,
  AUTH_COOKIE_DOMAIN,
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_SECURE,
  NEXTAUTH_SECRET,
  NEXT_PUBLIC_ALLOWED_CALLBACK_HOSTS,
  NEXT_PUBLIC_ORIGIN,
} from "@/app/config/env";
import {
  provisionUser,
  getUserByAzureId,
  toClaims,
} from "@/lib/platform/users";
import { logAudit } from "@/lib/platform/audit";

/**
 * Server-side callbackUrl whitelist: the portal itself plus the subapp hosts
 * in NEXT_PUBLIC_ALLOWED_CALLBACK_HOSTS. This is the authoritative check —
 * the login page applies the same rule client-side, but nothing stops a
 * crafted /api/auth/signin?callbackUrl=… from bypassing the page, so the
 * redirect callback must never trust an absolute URL it hasn't validated
 * (open-redirect protection on the company's central login).
 */
function isAllowedRedirectHost(hostname: string): boolean {
  const portalHostname = NEXT_PUBLIC_ORIGIN
    ? new URL(NEXT_PUBLIC_ORIGIN).hostname
    : "";
  if (hostname === portalHostname) return true;
  return (NEXT_PUBLIC_ALLOWED_CALLBACK_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean)
    .some((h) => hostname === h || hostname.endsWith(`.${h}`));
}

/**
 * How often JWT claims (role, status, company, department) are re-read from
 * the user directory. Keeps admin console changes (grants, disables,
 * promotions) taking effect without forcing a re-login.
 */
const CLAIMS_REFRESH_SECONDS = 5 * 60;

/** Entra ID token profile fields we care about beyond the defaults. */
interface AzureProfile {
  oid?: string;
  sub?: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  groups?: string[];
}

export const authOptions: AuthOptions = {
  providers: [
    AzureADProvider({
      clientId: AZURE_AD_CLIENT_ID,
      clientSecret: AZURE_AD_CLIENT_SECRET,
      tenantId: AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          // Always show the Microsoft account picker so shared machines /
          // people with multiple work accounts can choose the right one.
          prompt: "select_account",
        },
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 }, // 7 days
  jwt: { secret: NEXTAUTH_SECRET },
  cookies: {
    // The one cookie all apps will share
    sessionToken: {
      name: AUTH_COOKIE_NAME,
      options: {
        domain: AUTH_COOKIE_DOMAIN,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: AUTH_COOKIE_SECURE,
      },
    },
  },
  callbacks: {
    /**
     * Provision (or refresh) the directory record on every Microsoft sign-in
     * and block accounts an admin has disabled.
     */
    async signIn({ user, profile }) {
      const p = (profile ?? {}) as AzureProfile;
      const azureId = p.oid || p.sub || user.id;
      const email = (
        p.email ||
        p.preferred_username ||
        user.email ||
        ""
      ).toLowerCase();
      if (!azureId || !email) return false;

      const record = await provisionUser({
        azureId,
        email,
        name: p.name || user.name || "",
        image: user.image || "",
        entraGroups: Array.isArray(p.groups) ? p.groups : undefined,
      });

      if (record.status === "disabled") return false;

      await logAudit({
        action: "user.signed_in",
        actorEmail: email,
        targetType: "user",
        targetId: record._id.toString(),
        targetLabel: email,
      });
      return true;
    },

    async jwt({ token, account, user, profile }) {
      // Initial sign-in: stamp identity + directory claims into the token.
      if (account) {
        const p = (profile ?? {}) as AzureProfile;
        const azureId = p.oid || p.sub || user?.id || token.sub || "";
        token.userId = azureId;
        token.email = (
          p.email ||
          p.preferred_username ||
          user?.email ||
          token.email ||
          ""
        ).toLowerCase();
        token.name = p.name || user?.name || token.name;
        token.picture = token.picture ?? undefined;

        const record = await getUserByAzureId(azureId);
        if (record) {
          const claims = toClaims(record);
          token.uid = claims.uid;
          token.role = claims.role;
          token.status = claims.status;
          token.companyCode = claims.companyCode;
          token.departmentCode = claims.departmentCode;
        }
        token.claimsRefreshedAt = Math.floor(Date.now() / 1000);
        return token;
      }

      // Subsequent requests: periodically re-sync claims from the directory
      // so role changes / disables propagate without a re-login.
      //
      // Intentionally NOT self-healing here: identity is only ever created
      // or relinked during a real Microsoft sign-in (see the `account`
      // branch above and provisionUser's email-reconciliation), where we
      // have a verified, fresh `oid`. Reconstructing a directory record from
      // a cached token during a background refresh means trusting whatever
      // identity value that token happened to carry (e.g. a stale/opaque
      // `sub` from a session issued before this claims system existed),
      // which risks filing the user under the wrong key. If no record is
      // found here, the session simply carries no elevated claims until the
      // user signs in again — a clear, correct outcome rather than a guess.
      const refreshedAt =
        typeof token.claimsRefreshedAt === "number"
          ? token.claimsRefreshedAt
          : 0;
      const now = Math.floor(Date.now() / 1000);
      if (now - refreshedAt > CLAIMS_REFRESH_SECONDS) {
        try {
          const azureId =
            (typeof token.userId === "string" && token.userId) ||
            token.sub ||
            "";
          const record = azureId ? await getUserByAzureId(azureId) : null;

          if (record) {
            const claims = toClaims(record);
            token.uid = claims.uid;
            token.role = claims.role;
            token.status = claims.status;
            token.companyCode = claims.companyCode;
            token.departmentCode = claims.departmentCode;
          }
          token.claimsRefreshedAt = now;
        } catch (err) {
          // DB hiccups must not kill existing sessions; retry next request.
          console.error("[auth] claims refresh failed:", err);
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        const id =
          (typeof token.userId === "string" && token.userId) ||
          (typeof token.sub === "string" ? token.sub : "");
        session.user.id = id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = token.picture;
        session.user.uid =
          typeof token.uid === "string" ? token.uid : undefined;
        session.user.role =
          typeof token.role === "string" ? token.role : "member";
        session.user.status =
          typeof token.status === "string" ? token.status : "active";
        session.user.companyCode =
          typeof token.companyCode === "string" ? token.companyCode : "";
        session.user.departmentCode =
          typeof token.departmentCode === "string" ? token.departmentCode : "";
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Absolute callbackUrl (e.g. returning to a subapp) — only to
      // whitelisted SSP hosts; anything else falls back to the portal.
      if (url.startsWith("http")) {
        try {
          return isAllowedRedirectHost(new URL(url).hostname) ? url : baseUrl;
        } catch {
          return baseUrl;
        }
      }
      return new URL(url, baseUrl).toString();
    },
  },
};
