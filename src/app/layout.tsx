import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DEALER, SITE_URL } from "@/lib/constants";
import {
  DEFAULT_LOCALE,
  LOCALE_HEADER,
  OG_LOCALE,
  parseLocale,
} from "@/lib/i18n/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AUTOCAR EU — Vozila iz Njemačke i Austrije",
    template: "%s | AUTOCAR EU",
  },
  description:
    "Provjerena vozila iz Njemačke i Austrije. Osam godina povjerenja, preko 350 vozila na stanju, garancija do 3 godine i financiranje za sve zaposlene u Njemačkoj i Austriji.",
  keywords: [
    "rabljeni auti",
    "auti iz Njemačke",
    "auti iz Austrije",
    "autokredit",
    "financiranje vozila",
    "AUTOCAR EU",
  ],
  openGraph: {
    type: "website",
    locale: OG_LOCALE[DEFAULT_LOCALE],
    siteName: DEALER.name,
    title: "AUTOCAR EU — Vozila iz Njemačke i Austrije",
    description:
      "Preko 350 provjerenih vozila na stanju, garancija do 3 godine i financiranje za zaposlene u Njemačkoj i Austriji.",
    images: [{ url: "/brand/og.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AUTOCAR EU — Vozila iz Njemačke i Austrije",
    description:
      "Preko 350 provjerenih vozila na stanju, garancija do 3 godine i financiranje za zaposlene u Njemačkoj i Austriji.",
    images: ["/brand/og.jpg"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The locale lives in the [lang] route param, which a root layout can't read,
  // so the proxy forwards it as a header. Admin/API routes get the default.
  const locale = parseLocale((await headers()).get(LOCALE_HEADER));

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
