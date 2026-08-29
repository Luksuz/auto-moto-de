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
  /** Only the e-mail button asks for a notification. The WhatsApp buttons hand
   *  the enquiry to the dealer in the chat itself, so they skip the mail. */
  notify: z.boolean().default(false),
});

export type CreateLeadInput = z.input<typeof leadSchema>;

/** `mailed` is only meaningful when `notify` was set — it reports whether the
 *  message actually reached the SMTP server, not merely that it was attempted. */
export type CreateLeadResult =
  | { ok: true; mailed: boolean }
  | { ok: false; error: string };

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
    // Awaited, deliberately. This used to be fire-and-forget so it could not
    // delay the WhatsApp handoff, but a floating promise is killed when the
    // serverless invocation is frozen once the response is flushed — two of
    // the first three enquiries were recorded with no mail ever sent. Only the
    // e-mail button waits for this, and it has no redirect racing it.
    let mailed = false;
    if (data.notify) {
      try {
        mailed = await sendLeadNotification(lead);
      } catch (err) {
        // The lead is already stored, so this is reported, not thrown — the
        // visitor is told the mail failed and pointed at WhatsApp instead.
        console.error("lead mail failed:", err);
      }
    }
    return { ok: true, mailed };
  } catch {
    return {
      ok: false,
      error: "Došlo je do greške. Pokušajte ponovno ili nas nazovite.",
    };
  }
}
