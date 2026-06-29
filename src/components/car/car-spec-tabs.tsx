"use client";

import * as React from "react";
import { Check, ShieldCheck, MapPin, ListChecks, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatKm } from "@/lib/utils";
import {
  BODY_TYPE_LABEL,
  FUEL_TYPE_LABEL,
  TRANSMISSION_LABEL,
} from "@/lib/constants";
import type { CarWithRelations } from "@/lib/cars";

type SpecRow = { label: string; value: string };

function buildTechRows(car: CarWithRelations): SpecRow[] {
  const rows: SpecRow[] = [];
  const push = (label: string, value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === "") return;
    rows.push({ label, value: String(value) });
  };

  push("Marka", car.brand);
  push("Model", car.model);
  push("Vrsta karoserije", BODY_TYPE_LABEL[car.bodyType]);
  push("Prva registracija", car.firstRegistration);
  push("Kilometraža", formatKm(car.mileageKm));
  push("Gorivo", FUEL_TYPE_LABEL[car.fuelType]);
  push("Mjenjač", TRANSMISSION_LABEL[car.transmission]);
  push("Snaga", `${car.powerKw} kW (${car.powerKs} KS)`);
  push("Radni obujam", car.engineCcm ? `${car.engineCcm} ccm` : null);
  push("Broj vrata", car.doors);
  push("Broj sjedišta", car.seats);
  push("Klima uređaj", car.airConditioning);
  push("Parkirni senzori", car.parkingSensors);
  push("TÜV", car.tuv);
  push("Emisijska klasa", car.emissionClass);
  push("Porijeklo", car.origin);
  push(
    "Broj prethodnih vlasnika",
    car.previousOwners !== null && car.previousOwners !== undefined
      ? car.previousOwners
      : null,
  );

  return rows;
}

export function CarSpecTabs({ car }: { car: CarWithRelations }) {
  const techRows = buildTechRows(car);
  const hasEquipment = car.equipment.length > 0;
  const hasWarranty = Boolean(car.warranty?.trim());
  const hasOrigin = Boolean(car.origin?.trim() || car.originDetails?.trim());

  const tabs = [
    { id: "tech", label: "Tehnički detalji", icon: Wrench, show: techRows.length > 0 },
    { id: "equipment", label: "Oprema", icon: ListChecks, show: hasEquipment },
    { id: "warranty", label: "Garancija", icon: ShieldCheck, show: hasWarranty },
    { id: "origin", label: "Porijeklo vozila", icon: MapPin, show: hasOrigin },
  ].filter((t) => t.show);

  const [active, setActive] = React.useState(tabs[0]?.id ?? "tech");

  if (tabs.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap gap-1 border-b border-border bg-surface-2/50 p-1.5">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
                active === t.id
                  ? "bg-surface text-primary shadow-sm"
                  : "text-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-5 sm:p-6">
        {active === "tech" && (
          <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            {techRows.map((row, i) => (
              <div
                key={row.label}
                className={cn(
                  "flex items-center justify-between gap-4 border-b border-border/70 py-2.5 text-sm",
                  i < 2 && "sm:border-b",
                )}
              >
                <dt className="text-muted">{row.label}</dt>
                <dd className="text-right font-medium text-foreground">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {active === "equipment" && (
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {car.equipment.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm text-foreground"
              >
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        {active === "warranty" && (
          <div className="prose-sm max-w-none whitespace-pre-line text-sm leading-relaxed text-foreground/90">
            {car.warranty}
          </div>
        )}

        {active === "origin" && (
          <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
            {car.origin && (
              <p className="font-medium text-foreground">{car.origin}</p>
            )}
            {car.originDetails && (
              <div className="whitespace-pre-line">{car.originDetails}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
