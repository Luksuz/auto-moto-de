"use client";

import Link from "next/link";
import { Phone, MessageCircle, Search } from "lucide-react";
import { DEALER, whatsappLink } from "@/lib/constants";

/**
 * Fixed bottom action bar on mobile only. Keeps the three highest-intent
 * actions one tap away (reduced friction / EAST: easy + timely).
 */
export function StickyCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy/95 backdrop-blur-md lg:hidden">
      <div className="grid grid-cols-3 divide-x divide-white/10 pb-[env(safe-area-inset-bottom)]">
        <a
          href={`tel:${DEALER.phoneHref}`}
          className="flex flex-col items-center gap-1 py-2.5 text-white transition-colors active:bg-white/10"
        >
          <Phone className="size-5 text-primary" />
          <span className="text-[11px] font-semibold">Nazovi</span>
        </a>
        <a
          href={whatsappLink(
            "Pozdrav, zanima me vozilo i mogućnost financiranja.",
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 py-2.5 text-white transition-colors active:bg-white/10"
        >
          <MessageCircle className="size-5 text-[#25D366]" />
          <span className="text-[11px] font-semibold">WhatsApp</span>
        </a>
        <Link
          href="/vozila"
          className="flex flex-col items-center gap-1 py-2.5 text-white transition-colors active:bg-white/10"
        >
          <Search className="size-5 text-accent" />
          <span className="text-[11px] font-semibold">Pretraži</span>
        </Link>
      </div>
    </div>
  );
}
