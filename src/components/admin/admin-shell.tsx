"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  MessageSquare,
  Users,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions/auth-actions";
import { ROLE_LABEL } from "@/lib/constants";

type NavItem = { href: string; label: string; icon: React.ElementType };

const BASE_NAV: NavItem[] = [
  { href: "/admin", label: "Pregled", icon: LayoutDashboard },
  { href: "/admin/vozila", label: "Vozila", icon: Car },
  { href: "/admin/leads", label: "Upiti", icon: MessageSquare },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin/korisnici", label: "Korisnici", icon: Users },
];

export function AdminShell({
  user,
  children,
}: {
  user: { name?: string | null; email?: string | null; role: "ADMIN" | "AGENT" };
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const nav = user.role === "ADMIN" ? [...BASE_NAV, ...ADMIN_NAV] : BASE_NAV;

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-border bg-surface transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border-soft px-5">
          <Link href="/admin" aria-label="AUTOCAR EU">
            <Image
              src="/brand/autocar-logo.png"
              alt="AUTOCAR EU"
              width={1522}
              height={424}
              className="h-9 w-auto"
            />
          </Link>
          <button
            className="lg:hidden text-muted hover:text-foreground"
            onClick={() => setOpen(false)}
            aria-label="Zatvori izbornik"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Overlay (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-background/80 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border-soft bg-background/95 px-4 backdrop-blur lg:px-6">
          <button
            className="lg:hidden text-muted hover:text-foreground"
            onClick={() => setOpen(true)}
            aria-label="Otvori izbornik"
          >
            <Menu className="size-6" />
          </button>
          <div className="flex flex-1 items-center justify-end gap-4">
            <div className="text-right leading-tight">
              <div className="text-sm font-semibold text-foreground">
                {user.name}
              </div>
              <div className="text-xs text-muted">{ROLE_LABEL[user.role]}</div>
            </div>
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="border-border-strong bg-transparent font-display text-[13px] font-semibold uppercase tracking-[2px] text-muted hover:border-error hover:bg-transparent hover:text-error"
              >
                <LogOut className="size-4" />
                Odjava
              </Button>
            </form>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
