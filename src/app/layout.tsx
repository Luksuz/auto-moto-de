import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DEALER, SITE_URL } from "@/lib/constants";

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
    locale: "hr_HR",
    siteName: DEALER.name,
    title: "AUTOCAR EU — Vozila iz Njemačke i Austrije",
    description:
      "Preko 350 provjerenih vozila na stanju, garancija do 3 godine i financiranje za zaposlene u Njemačkoj i Austriji.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="hr"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
