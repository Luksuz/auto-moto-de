import type {
  BodyType,
  FuelType,
  Transmission,
  LeadType,
  LeadStatus,
  Role,
} from "@prisma/client";

/** Canonical site origin for metadata/sitemap (no AUTOCAR EU domain provided yet). */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kupiauto.de";

/** Dealership / contact info shown across the site. */
export const DEALER = {
  name: "AUTOCAR EU",
  email: "autocareupremium@gmail.com",
  whatsappDe: "491713682790",
  whatsappDePretty: "+49 171 3682790",
  whatsappHr: "385915940692",
  whatsappHrPretty: "+385 91 594 0692",
  facebook: "https://www.facebook.com/groups/434685440223423",
  since: 2018,
} as const;

/** Insurance advisor featured on /osiguranje. */
export const INSURANCE_ADVISOR = {
  name: "Goran Kanjir",
  company: "Allfinanz Deutsche Vermögensberatung",
  whatsappDe: "491733121590",
  whatsappDePretty: "+49 173 312 1590",
  whatsappAt: "4366499067677",
  whatsappAtPretty: "+43 664 990 67677",
  email: "goran.kanjir@allfinanz.ag",
} as const;

/** Financing headline figures (from uvjeti-financiranja). */
export const FINANCING = {
  minRate: 5.99,
  maxRate: 8.99,
  exampleRate: 6.99,
  exampleMonths: 84,
  downPayment: 0,
  approvalHours: 24,
} as const;

export const BODY_TYPE_LABEL: Record<BodyType, string> = {
  LIMUZINA: "Limuzina",
  KARAVAN: "Karavan",
  SUV: "SUV",
  MONOVOLUMEN: "Monovolumen",
  MALI_AUTO: "Mali auto",
  COUPE: "Coupé",
  KABRIOLET: "Kabriolet",
  TERENAC: "Terenac",
  PICKUP: "Pickup",
};

export const FUEL_TYPE_LABEL: Record<FuelType, string> = {
  DIESEL: "Diesel",
  BENZIN: "Benzin",
  HYBRID: "Hybrid",
  ELEKTRICNI: "Električni",
  PLIN: "Plin",
};

export const TRANSMISSION_LABEL: Record<Transmission, string> = {
  AUTOMATSKI: "Automatski",
  MANUALNI: "Manualni",
};

export const LEAD_TYPE_LABEL: Record<LeadType, string> = {
  CONTACT: "Upit",
  FINANCING: "Financiranje",
  VIEWING: "Razgledavanje",
  PROBLEM: "Prijava problema",
  INSURANCE: "Osiguranje",
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: "Novo",
  CONTACTED: "Kontaktirano",
  CLOSED: "Zatvoreno",
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  AGENT: "Agent",
};

/** Main site navigation — labels resolved via the i18n dictionary. */
export const SITE_NAV = [
  { key: "navHome", href: "/" },
  { key: "navCars", href: "/vozila" },
  { key: "navFinancing", href: "/financiranje" },
  { key: "navProblem", href: "/prijavi-problem" },
  { key: "navInsurance", href: "/osiguranje" },
  { key: "navAbout", href: "/o-nama" },
] as const;

/** Footer links to the kept informational pages (labels via i18n keys). */
export const INFO_NAV = [
  { key: "infoPurchase", href: "/postupak-kupnje" },
  { key: "infoFinancingTerms", href: "/uvjeti-financiranja" },
  { key: "infoHandover", href: "/tijek-preuzimanja" },
  { key: "infoAppointment", href: "/termin-za-preuzimanje" },
  { key: "infoComplaints", href: "/reklamacije" },
  { key: "infoImpressum", href: "/impressum" },
] as const;

/** Helper: enum->options for select inputs. */
export function toOptions<T extends string>(
  map: Record<T, string>,
): { value: T; label: string }[] {
  return (Object.keys(map) as T[]).map((value) => ({ value, label: map[value] }));
}

export function whatsappLink(
  text?: string,
  number: string = DEALER.whatsappDe,
): string {
  const base = `https://wa.me/${number}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
