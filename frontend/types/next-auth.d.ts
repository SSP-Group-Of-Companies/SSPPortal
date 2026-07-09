import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** Azure AD object id (oid). */
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      /** Portal directory id (Mongo _id). */
      uid?: string;
      role?: string; // "member" | "admin" | "superadmin"
      status?: string; // "active" | "disabled"
      companyCode?: string;
      departmentCode?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string;
    name?: string;
    picture?: string | null;
    /** Azure AD object id. */
    userId?: string;
    /** Portal directory id (Mongo _id). */
    uid?: string;
    role?: string;
    status?: string;
    companyCode?: string;
    departmentCode?: string;
    /** Unix seconds of the last directory claims sync. */
    claimsRefreshedAt?: number;
  }
}
