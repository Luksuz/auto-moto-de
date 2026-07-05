import type { Metadata } from "next";
import { oswald, hanken } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Admin panel | AUTOCAR EU",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${oswald.variable} ${hanken.variable} theme-autocar min-h-dvh bg-background font-body text-foreground`}
    >
      {children}
    </div>
  );
}
