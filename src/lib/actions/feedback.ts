"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { FeedbackStatus } from "@prisma/client";

const STATUSES: FeedbackStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

const itemSchema = z.object({
  title: z.string().min(2, "Naslov je obavezan").max(160),
  body: z.string().max(4000).optional(),
  author: z.string().min(1).max(60).default("Klijent"),
  pageUrl: z.string().max(300).optional(),
});

export async function createFeedbackItem(input: unknown) {
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Greška" };
  }
  await prisma.feedbackItem.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body || null,
      author: parsed.data.author,
      pageUrl: parsed.data.pageUrl || null,
    },
  });
  revalidatePath("/feedback");
  return { ok: true as const };
}

export async function updateFeedbackStatus(id: string, status: string) {
  if (!STATUSES.includes(status as FeedbackStatus)) {
    return { ok: false as const, error: "Nevažeći status" };
  }
  await prisma.feedbackItem.update({
    where: { id },
    data: { status: status as FeedbackStatus },
  });
  revalidatePath("/feedback");
  return { ok: true as const };
}

export async function editFeedbackItem(id: string, input: unknown) {
  const parsed = itemSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Greška" };
  }
  await prisma.feedbackItem.update({
    where: { id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.body !== undefined ? { body: parsed.data.body || null } : {}),
    },
  });
  revalidatePath("/feedback");
  return { ok: true as const };
}

export async function deleteFeedbackItem(id: string) {
  await prisma.feedbackItem.delete({ where: { id } });
  revalidatePath("/feedback");
  return { ok: true as const };
}

const commentSchema = z.object({
  itemId: z.string().min(1),
  author: z.string().min(1).max(60).default("Klijent"),
  body: z.string().min(1, "Komentar je prazan").max(2000),
});

export async function addFeedbackComment(input: unknown) {
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Greška" };
  }
  await prisma.feedbackComment.create({
    data: {
      itemId: parsed.data.itemId,
      author: parsed.data.author,
      body: parsed.data.body,
    },
  });
  revalidatePath("/feedback");
  return { ok: true as const };
}
