import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config (no DB / Node-only imports).
 * Used by middleware and extended in src/auth.ts with the Credentials provider.
 */
export const authConfig = {
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === "/admin/login";
      const isAdminArea = nextUrl.pathname.startsWith("/admin");

      if (isLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL("/admin", nextUrl));
        return true;
      }
      if (isAdminArea) return isLoggedIn;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "AGENT";
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
