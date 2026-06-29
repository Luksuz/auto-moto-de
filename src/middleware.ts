import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// Used directly as middleware: NextAuth applies the `authorized` callback
// from authConfig to decide access for matched routes.
export default auth;

export const config = {
  matcher: ["/admin/:path*"],
};
