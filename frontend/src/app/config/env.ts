// Where Portal runs
export const NEXT_PUBLIC_ORIGIN = process.env.NEXT_PUBLIC_ORIGIN!;

// Cookie shared across sub‑apps
export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME! || "SSP_AUTH_TOKEN";
export const AUTH_COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN! || ".sspportal.lvh.me";

// NextAuth
export const NEXTAUTH_URL = process.env.NEXTAUTH_URL;
export const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

// Azure AD
export const AZURE_AD_CLIENT_ID = process.env.AZURE_AD_CLIENT_ID!;
export const AZURE_AD_CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET!;
export const AZURE_AD_TENANT_ID = process.env.AZURE_AD_TENANT_ID!;

// Whitelist hosts we allow for callbackUrl (comma‑separated)
export const NEXT_PUBLIC_ALLOWED_CALLBACK_HOSTS = process.env.NEXT_PUBLIC_ALLOWED_CALLBACK_HOSTS!;
