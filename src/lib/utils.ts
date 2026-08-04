import { LOCALE_TAG, type Locale } from "@/lib/i18n/config";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a price in EUR using de-DE grouping (e.g. 25.990 €). */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat("de-DE").format(value) + " €";
}

/** Format mileage as "76.000 km". */
export function formatKm(value: number): string {
  return new Intl.NumberFormat("de-DE").format(value) + " km";
}

/** Estimated monthly financing rate shown on cards/detail (prototype heuristic). */
export function estimateMonthlyRate(priceEur: number): number {
  return Math.round(priceEur / 86);
}

/** Build a URL-safe slug from a car title. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

/** Date only, in the visitor's locale. Used for the "last updated" labels, where
 *  the time of day is noise — a buyer cares whether the offer is from today or
 *  from three weeks ago. */
export function fmtDate(date: Date, locale: string = "hr"): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale as Locale] ?? "hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
