"use client";

import * as React from "react";
import type { LeadType } from "@prisma/client";
import { createLead } from "@/lib/actions/leads";
import { whatsappLink } from "@/lib/constants";

interface LeadSubmitInput {
  type: LeadType;
  name: string;
  phone: string;
  email?: string;
  /** Full serialized WhatsApp body — stored as the lead message too. */
  message: string;
  carId?: string;
  /** wa.me number (digits only) the visitor is sent to. */
  waNumber: string;
}

/**
 * Shared lead submission: persist via the createLead server action, then
 * navigate to WhatsApp with the prefilled message. Same-tab navigation —
 * window.open after an await is killed by popup blockers.
 */
export function useLeadSubmit() {
  const [pending, setPending] = React.useState(false);

  // Re-enable the form when the browser restores the page from bfcache
  // after the visitor comes Back from wa.me.
  React.useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setPending(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const submit = React.useCallback(async (input: LeadSubmitInput) => {
    setPending(true);
    try {
      const result = await createLead({
        name: input.name,
        phone: input.phone,
        email: input.email ?? "",
        message: input.message,
        carId: input.carId ?? "",
        type: input.type,
      });
      if (!result.ok) console.error("createLead failed:", result.error);
    } catch (err) {
      // Still hand the visitor over to WhatsApp — the inquiry reaches the
      // dealer either way; only the admin record is lost.
      console.error("createLead threw:", err);
    }
    window.location.href = whatsappLink(input.message, input.waNumber);
  }, []);

  return { submit, pending };
}
