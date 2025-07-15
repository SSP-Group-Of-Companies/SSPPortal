import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      // Add more if needed: role?: string; department?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id?: string;
    // Optional: role?: string; department?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string;
    name?: string;
    picture?: string | null;
    // Optional: role?: string; department?: string;
  }
}
