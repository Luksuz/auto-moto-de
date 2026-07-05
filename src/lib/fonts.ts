import { Oswald, Hanken_Grotesk } from "next/font/google";

/** AUTOCAR EU display font — uppercase headings, prices, CTAs. */
export const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin", "latin-ext"],
});

/** AUTOCAR EU body font. */
export const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin", "latin-ext"],
});
