"use server";

import { z } from "zod";
import { LeadType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendLeadNotification } from "@/lib/mailer";

const leadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Unesite ime i prezime."),
  phone: z
    .string()
    .trim()
    .min(6, "Unesite ispravan broj telefona."),
  email: z
    .string()
    .trim()
    .email("Unesite ispravnu e-mail adresu.")
    .optional()
    .or(z.literal("")),
  // Stores the full composed WhatsApp body (unbounded @db.Text column);
  // generous cap so long problem descriptions don't silently drop the lead.
  message: z.string().trim().max(8000).optional().or(z.literal("")),
  carId: z.string().trim().optional().or(z.literal("")),
  type: z.nativeEnum(LeadType).default(LeadType.CONTACT),
});

export type CreateLeadInput = z.input<typeof leadSchema>;

export type CreateLeadResult = { ok: true } | { ok: false; error: string };

export async function createLead(
  input: CreateLeadInput,
): Promise<CreateLeadResult> {
  const parsed = leadSchema.safeParse(input);

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Neispravni podaci.";
    return { ok: false, error: first };
  }

  const data = parsed.data;

  try {
    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email ? data.email : null,
        message: data.message ? data.message : null,
        type: data.type,
        carId: data.carId ? data.carId : null,
      },
    });
    // Fire-and-forget — a mail failure must never block the visitor's
    // WhatsApp handoff; the lead is already saved and visible in admin.
    sendLeadNotification(lead).catch((err) =>
      console.error("lead mail failed:", err),
    );
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Došlo je do greške. Pokušajte ponovno ili nas nazovite.",
    };
  }
}
