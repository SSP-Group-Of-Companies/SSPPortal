import AzureADProvider from "next-auth/providers/azure-ad";
import type { AuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import { AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID, COOKIE_DOMAIN, COOKIE_NAME, NEXTAUTH_SECRET } from "@/app/config/env";

export const authOptions: AuthOptions = {
  providers: [
    AzureADProvider({
      clientId: AZURE_AD_CLIENT_ID,
      clientSecret: AZURE_AD_CLIENT_SECRET,
      tenantId: AZURE_AD_TENANT_ID,
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 }, // 7 days
  jwt: { secret: NEXTAUTH_SECRET },
  cookies: {
    // The one cookie all apps will share
    sessionToken: {
      name: COOKIE_NAME,
      options: {
        domain: COOKIE_DOMAIN,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: true,
      },
    },
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        token.userId = user?.id ?? token.sub;
        token.email = user?.email ?? token.email;
        token.name = user?.name ?? token.name;
        token.picture = token.picture ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Prefer token.userId; fall back to token.sub; default to empty string
        const id = (typeof (token as JWT & { userId?: string }).userId === "string" && (token as JWT & { userId?: string }).userId) || (typeof token.sub === "string" ? token.sub : "");

        session.user.id = id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = token.picture;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allow absolute callbackUrl (e.g., returning to a sub‑app)
      if (url.startsWith("http")) return url;
      return new URL(url, baseUrl).toString();
    },
  },
};
