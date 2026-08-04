import { Oswald, Hanken_Grotesk, Manrope } from "next/font/google";

/** AUTOCAR EU display font — uppercase headings, prices, CTAs. */
export const oswald = Oswald({
  variable: "--font-oswald",
  // Ukrainian needs the basic Cyrillic block; Oswald ships it.
  subsets: ["latin", "latin-ext", "cyrillic"],
});

/** AUTOCAR EU body font. Latin only — Hanken Grotesk publishes cyrillic-ext but
 *  NOT the basic `cyrillic` subset, so it has no glyphs for Ukrainian at all. */
export const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin", "latin-ext"],
});

/** Cyrillic companion for the body text. It is listed after Hanken in the font
 *  stack, so Latin still renders in Hanken and only the glyphs Hanken lacks —
 *  i.e. Ukrainian — fall through to this. Without it Ukrainian would render in
 *  whatever sans-serif the visitor's OS happens to provide. */
export const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["cyrillic", "latin"],
});
