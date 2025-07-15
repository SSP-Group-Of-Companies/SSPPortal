import NextAuth from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
       authorization: {
        params: {
          scope: "openid profile email User.Read",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  jwt: {
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.email = profile.email;
        token.name = profile.name;
        token.id = profile.sub || account.providerAccountId;

        // RBAC FIELDS (ENABLE WHEN READY):
        // Uncomment below if your Azure AD includes department and job title claims.
        // token.department = profile.department || null;
        // token.role = profile.jobTitle || "Employee";

        // Try to fetch profile image from Microsoft Graph
        try {
          const graphRes = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
            },
          });

          if (graphRes.ok) {
            const buffer = await graphRes.arrayBuffer();
            const base64 = Buffer.from(buffer).toString("base64");
            token.picture = `data:image/jpeg;base64,${base64}`;
          } else {
            token.picture = null;
          }
        } catch (error) {
          console.error("Failed to fetch profile picture:", error);
          token.picture = null;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = token.picture;

        // RBAC SESSION SYNC (ENABLE WHEN YOU ENABLE ABOVE):
        // session.user.department = token.department;
        // session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
