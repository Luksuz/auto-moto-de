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
