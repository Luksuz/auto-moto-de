import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DEALER } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kupiauto.de"),
  title: {
    default: "KupiAuto.de — Rabljena vozila iz Njemačke uz financiranje",
    template: "%s | KupiAuto.de",
  },
  description:
    "Provjerena rabljena vozila iz Njemačke. Financiranje 100% online, 0% učešća, odobrenje unutar 24h za sve zaposlene u Njemačkoj.",
  keywords: [
    "rabljeni auti",
    "auti iz Njemačke",
    "autokredit",
    "financiranje vozila",
    "KupiAuto",
  ],
  openGraph: {
    type: "website",
    locale: "hr_HR",
    siteName: DEALER.name,
    title: "KupiAuto.de — Rabljena vozila iz Njemačke",
    description:
      "Financiranje 100% online, 0% učešća, odobrenje unutar 24h.",
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
