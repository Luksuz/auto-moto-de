"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export type UserActionState = { ok?: boolean; error?: string };

const userSchema = z.object({
  name: z.string().trim().min(2, "Ime je obavezno"),
  email: z.string().trim().toLowerCase().email("Neispravna e-mail adresa"),
  password: z.string().min(6, "Lozinka mora imati barem 6 znakova"),
  role: z.enum(["ADMIN", "AGENT"]),
  phone: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().nullish(),
  ),
});

export async function createUser(formData: FormData): Promise<UserActionState> {
  await requireAdmin();

  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }

  const exists = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (exists) return { ok: false, error: "Korisnik s tom e-mail adresom već postoji" };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
      phone: parsed.data.phone ?? null,
    },
  });

  revalidatePath("/admin/korisnici");
  return { ok: true };
}

export async function updateUserRole(
  id: string,
  role: "ADMIN" | "AGENT",
): Promise<UserActionState> {
  await requireAdmin();
  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/admin/korisnici");
  return { ok: true };
}

export async function toggleUserActive(
  id: string,
  active: boolean,
): Promise<UserActionState> {
  const admin = await requireAdmin();
  if (admin.id === id) {
    return { ok: false, error: "Ne možete deaktivirati vlastiti račun" };
  }
  await prisma.user.update({ where: { id }, data: { active } });
  revalidatePath("/admin/korisnici");
  return { ok: true };
}
