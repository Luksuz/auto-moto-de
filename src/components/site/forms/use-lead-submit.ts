"use client";

import * as React from "react";
import type { LeadType } from "@prisma/client";
import { createLead } from "@/lib/actions/leads";
import { whatsappLink } from "@/lib/constants";

/** Which way the visitor chose to send the enquiry. Every form offers both:
 *  "email" delivers it to the dealer's inbox and keeps the visitor on the page,
 *  "whatsapp" hands them to the chat with the message prefilled. Both record
 *  the lead — /admin/leads stays the one complete list either way. */
export type LeadChannel = "email" | "whatsapp";

export type LeadStatus =
  | { kind: "sent" }
  /** Stored, but the mail did not reach the SMTP server. */
  | { kind: "mailFailed" }
  | { kind: "error"; message?: string };

interface LeadSubmitInput {
  type: LeadType;
  name: string;
  phone: string;
  email?: string;
  /** Full serialized WhatsApp body — stored as the lead message too. */
  message: string;
  carId?: string;
  /** wa.me number (digits only) the visitor is sent to. Required for "whatsapp". */
  waNumber?: string;
}

/**
 * Shared lead submission. Persists via the createLead server action, then
 * either reports the result inline (email) or navigates to WhatsApp with the
 * prefilled message (whatsapp). Same-tab navigation — window.open after an
 * await is killed by popup blockers.
 */
export function useLeadSubmit() {
  const [pending, setPending] = React.useState(false);
  const [status, setStatus] = React.useState<LeadStatus | null>(null);

  // Re-enable the form when the browser restores the page from bfcache
  // after the visitor comes Back from wa.me.
  React.useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setPending(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const submit = React.useCallback(
    async (channel: LeadChannel, input: LeadSubmitInput) => {
      setPending(true);
      setStatus(null);

      let result: Awaited<ReturnType<typeof createLead>> | null = null;
      try {
        result = await createLead({
          name: input.name,
          phone: input.phone,
          email: input.email ?? "",
          message: input.message,
          carId: input.carId ?? "",
          type: input.type,
          notify: channel === "email",
        });
      } catch (err) {
        console.error("createLead threw:", err);
      }

      if (channel === "whatsapp") {
        // Hand the visitor over even when the record failed — the enquiry
        // reaches the dealer in the chat either way; only the admin row is lost.
        window.location.href = whatsappLink(input.message, input.waNumber);
        return;
      }

      setPending(false);
      if (!result) setStatus({ kind: "error" });
      else if (!result.ok) setStatus({ kind: "error", message: result.error });
      else setStatus(result.mailed ? { kind: "sent" } : { kind: "mailFailed" });
    },
    [],
  );

  return { submit, pending, status };
}
