import { z } from "zod";

const bodyTypes = [
  "LIMUZINA",
  "KARAVAN",
  "SUV",
  "MONOVOLUMEN",
  "MALI_AUTO",
  "COUPE",
  "KABRIOLET",
  "TERENAC",
  "PICKUP",
] as const;

const fuelTypes = ["DIESEL", "BENZIN", "HYBRID", "ELEKTRICNI", "PLIN"] as const;
const transmissions = ["AUTOMATSKI", "MANUALNI"] as const;
const priceRatings = ["SEHR_GUTER", "GUTER", "FAIRER"] as const;

/** Image payload sent from the client image manager. */
export const carImageSchema = z.object({
  id: z.string().optional(),
  url: z.string().min(1),
  key: z.string().min(1),
  alt: z.string().nullish(),
  sortOrder: z.number().int(),
  isPrimary: z.boolean(),
});

export type CarImageInput = z.infer<typeof carImageSchema>;

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const optString = z.preprocess(emptyToNull, z.string().nullish());
const optInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number().int().nonnegative().nullish(),
);

export const carSchema = z.object({
  title: z.string().trim().min(2, "Naslov je obavezan"),
  brand: z.string().trim().min(1, "Marka je obavezna"),
  model: z.string().trim().min(1, "Model je obavezan"),
  slug: z.preprocess(emptyToNull, z.string().nullish()),
  published: z.coerce.boolean().default(false),
  featured: z.coerce.boolean().default(false),
  priceEur: z.coerce
    .number({ message: "Cijena je obavezna" })
    .int()
    .positive("Cijena mora biti veća od 0"),
  priceRating: z.preprocess(emptyToNull, z.enum(priceRatings).nullish()),
  assignedAgentId: z.preprocess(emptyToNull, z.string().nullish()),

  // Tehnički detalji
  bodyType: z.enum(bodyTypes, { message: "Karoserija je obavezna" }),
  firstRegistration: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])\/\d{4}$/, "Format mora biti MM/GGGG"),
  mileageKm: z.coerce
    .number({ message: "Kilometraža je obavezna" })
    .int()
    .nonnegative(),
  fuelType: z.enum(fuelTypes, { message: "Gorivo je obavezno" }),
  powerKw: z.coerce.number({ message: "Snaga (kW) je obavezna" }).int().nonnegative(),
  powerKs: z.coerce.number({ message: "Snaga (KS) je obavezna" }).int().nonnegative(),
  transmission: z.enum(transmissions, { message: "Mjenjač je obavezan" }),
  engineCcm: optInt,
  doors: optString,
  seats: optInt,
  airConditioning: optString,
  parkingSensors: optString,
  tuv: optString,
  emissionClass: optString,
  origin: optString,
  previousOwners: optInt,

  // Rich text
  description: optString,
  warranty: optString,
  originDetails: optString,

  // Lists
  equipment: z.array(z.string().trim().min(1)).default([]),
  images: z.array(carImageSchema).default([]),
});

export type CarInput = z.input<typeof carSchema>;
export type CarParsed = z.infer<typeof carSchema>;
