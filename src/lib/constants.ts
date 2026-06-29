import type {
  BodyType,
  FuelType,
  Transmission,
  PriceRating,
  LeadType,
  LeadStatus,
  Role,
} from "@prisma/client";

/** Dealership / contact info shown across the site. */
export const DEALER = {
  name: "KupiAuto.de",
  legalName: "LON CARS",
  agent: "Ivan Vidović",
  phone: "+49 177 4012397",
  phoneHref: "+491774012397",
  whatsapp: "491774012397",
  email: "kontakt@kupiauto.de",
  web: "www.kupiauto.de",
  street: "Liebigstr. 27",
  city: "DE-74211 Leingarten",
  hoursWeek: "09:00 - 18:00h",
  hoursSat: "09:00 - 14:00h",
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

/** German price-rating labels, kept verbatim as on the original site. */
export const PRICE_RATING_LABEL: Record<PriceRating, string> = {
  SEHR_GUTER: "Sehr guter Preis",
  GUTER: "Guter Preis",
  FAIRER: "Fairer Preis",
};

export const LEAD_TYPE_LABEL: Record<LeadType, string> = {
  CONTACT: "Upit",
  FINANCING: "Financiranje",
  VIEWING: "Razgledavanje",
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

export const NAV_LINKS = [
  { href: "/", label: "Naslovnica" },
  { href: "/vozila", label: "Vozila" },
  { href: "/o-nama", label: "O nama" },
  { href: "/postupak-kupnje", label: "Postupak kupnje" },
  { href: "/uvjeti-financiranja", label: "Uvjeti financiranja" },
] as const;

/** Helper: enum->options for select inputs. */
export function toOptions<T extends string>(
  map: Record<T, string>,
): { value: T; label: string }[] {
  return (Object.keys(map) as T[]).map((value) => ({ value, label: map[value] }));
}

export function whatsappLink(text?: string): string {
  const base = `https://wa.me/${DEALER.whatsapp}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
