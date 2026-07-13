// Where Portal runs
export const NEXT_PUBLIC_ORIGIN = process.env.NEXT_PUBLIC_ORIGIN!;

// Cookie shared across sub‑apps
export const AUTH_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME! || "SSP_AUTH_TOKEN";
export const AUTH_COOKIE_DOMAIN =
  process.env.AUTH_COOKIE_DOMAIN! || "localhost";

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
