// Where Portal runs
export const NEXT_PUBLIC_ORIGIN = process.env.NEXT_PUBLIC_ORIGIN!;

// Cookie shared across sub‑apps
export const AUTH_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME! || "SSP_AUTH_TOKEN";

/**
 * Parent domain for the shared session cookie (e.g. `ssp4you.com`, `localhost`).
 * Leave unset for host-only cookies (required on `*.vercel.app` — browsers
 * reject `Domain=vercel.app` because it is on the Public Suffix List).
 */
function resolveAuthCookieDomain(): string | undefined {
  const raw = (process.env.AUTH_COOKIE_DOMAIN ?? "").trim().replace(/^\./, "");
  if (!raw) return undefined;
  // Public suffix — setting Domain= here makes the browser drop the cookie.
  if (raw === "vercel.app" || raw.endsWith(".vercel.app")) return undefined;
  return raw;
}

export const AUTH_COOKIE_DOMAIN = resolveAuthCookieDomain();

// Secure cookies require HTTPS. Local HTTP (no Caddy) must set this false.
export const AUTH_COOKIE_SECURE = (NEXT_PUBLIC_ORIGIN ?? "").startsWith(
  "https://",
);

// NextAuth
export const NEXTAUTH_URL = process.env.NEXTAUTH_URL;
export const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

// Azure AD
export const AZURE_AD_CLIENT_ID = process.env.AZURE_AD_CLIENT_ID!;
export const AZURE_AD_CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET!;
export const AZURE_AD_TENANT_ID = process.env.AZURE_AD_TENANT_ID!;

// MongoDB (platform data: users, apps, companies, departments, audit)
export const MONGO_URI = process.env.MONGO_URI!;

// Bootstrap superadmins — comma-separated emails promoted to superadmin on
// first sign-in. Everything else is managed from the admin console.
export const ADMIN_EMAILS = process.env.ADMIN_EMAILS ?? "";

// Whitelist hosts we allow for callbackUrl (comma‑separated)
export const NEXT_PUBLIC_ALLOWED_CALLBACK_HOSTS =
  process.env.NEXT_PUBLIC_ALLOWED_CALLBACK_HOSTS!;
