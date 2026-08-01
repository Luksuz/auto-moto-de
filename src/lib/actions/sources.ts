"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export type SourceActionState = { ok?: boolean; error?: string };

const PANEL = "/admin/izvori";

/** The worker only knows how to read mobile.de dealer inventory pages, so reject
 *  anything else at the form rather than letting a run fail six hours later. */
const sourceSchema = z.object({
  label: z.string().trim().min(2, "Naziv je obavezan"),
  url: z
    .string()
    .trim()
    .url("Neispravan URL")
    .refine((u) => /(^|\.)mobile\.de$/i.test(new URL(u).hostname), {
      message: "URL mora biti s mobile.de (npr. https://home.mobile.de/NAZIVTVRTKE)",
    }),
  intervalDays: z.coerce
    .number()
    .int()
    .min(1, "Interval mora biti barem 1 dan")
    .max(365, "Interval može biti najviše 365 dana"),
});

export async function createSource(formData: FormData): Promise<SourceActionState> {
  await requireAdmin();

  const parsed = sourceSchema.safeParse({
    label: formData.get("label"),
    url: formData.get("url"),
    intervalDays: formData.get("intervalDays") || 14,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const exists = await prisma.dealerSource.findUnique({
    where: { url: parsed.data.url },
    select: { id: true },
  });
  if (exists) return { ok: false, error: "Taj je izvor već dodan" };

  await prisma.dealerSource.create({
    data: {
      label: parsed.data.label,
      url: parsed.data.url,
      intervalDays: parsed.data.intervalDays,
      // Due immediately: the next hourly worker tick picks it up.
      nextRunAt: new Date(),
    },
  });

  revalidatePath(PANEL);
  return { ok: true };
}

export async function updateSourceInterval(
  id: string,
  intervalDays: number,
): Promise<SourceActionState> {
  await requireAdmin();
  if (!Number.isInteger(intervalDays) || intervalDays < 1 || intervalDays > 365) {
    return { ok: false, error: "Interval mora biti između 1 i 365 dana" };
  }
  await prisma.dealerSource.update({ where: { id }, data: { intervalDays } });
  revalidatePath(PANEL);
  return { ok: true };
}

export async function toggleSourceEnabled(
  id: string,
  enabled: boolean,
): Promise<SourceActionState> {
  await requireAdmin();
  await prisma.dealerSource.update({ where: { id }, data: { enabled } });
  revalidatePath(PANEL);
  return { ok: true };
}

/** "Scrape now" is just a due date. The worker on Railway ticks hourly and picks
 *  up anything due, so there is no HTTP call from Vercel to Railway to secure,
 *  and no request that can time out mid-scrape. */
export async function runSourceNow(id: string): Promise<SourceActionState> {
  await requireAdmin();
  await prisma.dealerSource.update({
    where: { id },
    data: { enabled: true, nextRunAt: new Date() },
  });
  revalidatePath(PANEL);
  return { ok: true };
}

/** Removes the source. Cars it imported stay (Car.dealerSourceId is SetNull) —
 *  deleting a feed should not delete the inventory it produced, and the admin can
 *  still remove individual cars under Vozila. */
export async function deleteSource(id: string): Promise<SourceActionState> {
  await requireAdmin();
  await prisma.dealerSource.delete({ where: { id } });
  revalidatePath(PANEL);
  return { ok: true };
}
