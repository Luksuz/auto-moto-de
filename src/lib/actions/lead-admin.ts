"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

export type LeadActionState = { ok?: boolean; error?: string };

const STATUSES = ["NEW", "CONTACTED", "CLOSED"] as const;
type LeadStatus = (typeof STATUSES)[number];

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<LeadActionState> {
  await requireUser();
  if (!STATUSES.includes(status)) {
    return { ok: false, error: "Nepoznati status" };
  }
  await prisma.lead.update({ where: { id }, data: { status } });
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  return { ok: true };
}
