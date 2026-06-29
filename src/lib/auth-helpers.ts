import { auth } from "@/auth";
import { redirect } from "next/navigation";

/** Returns the session or redirects to login. Use in admin server components. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  return session.user;
}

/** Returns the session or redirects; throws to /admin if not ADMIN. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/admin");
  return user;
}
