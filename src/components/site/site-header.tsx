"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Phone, Car, MessageSquarePlus } from "lucide-react";
import { NAV_LINKS, DEALER, whatsappLink } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-lg tracking-tight">
          <span className="grid size-9 place-items-center rounded-lg bg-navy text-white">
            <Car className="size-5" />
          </span>
          <span>
            Kupi<span className="text-primary">Auto</span>
            <span className="text-muted">.de</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-primary bg-primary/5"
                    : "text-foreground hover:bg-surface-2",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="outline" size="sm">
            <Link href="/feedback">
              <MessageSquarePlus className="size-4" />
              Feedback
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href={`tel:${DEALER.phoneHref}`}>
              <Phone className="size-4" />
              {DEALER.phone}
            </a>
          </Button>
          <Button asChild variant="whatsapp" size="sm">
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </Button>
        </div>

        <button
          className="lg:hidden grid size-10 place-items-center rounded-lg hover:bg-surface-2"
          onClick={() => setOpen((v) => !v)}
          aria-label="Izbornik"
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-surface px-4 py-3">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-surface-2"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/feedback"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-accent-600 hover:bg-surface-2"
            >
              <MessageSquarePlus className="size-4" />
              Feedback ploča
            </Link>
          </nav>
          <div className="mt-3 flex gap-2">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <a href={`tel:${DEALER.phoneHref}`}>
                <Phone className="size-4" /> Nazovi
              </a>
            </Button>
            <Button asChild variant="whatsapp" size="sm" className="flex-1">
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
