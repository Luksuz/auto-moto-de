"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  BODY_TYPE_LABEL,
  FUEL_TYPE_LABEL,
  TRANSMISSION_LABEL,
  toOptions,
} from "@/lib/constants";

interface HeroSearchProps {
  brands: string[];
  modelsByBrand: Record<string, string[]>;
}

const PRICE_STEPS = [5000, 7500, 10000, 15000, 20000, 25000, 30000, 40000, 50000];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2007 }, (_, i) => CURRENT_YEAR - i);

const bodyOptions = toOptions(BODY_TYPE_LABEL);
const fuelOptions = toOptions(FUEL_TYPE_LABEL);
const transmissionOptions = toOptions(TRANSMISSION_LABEL);

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
      {children}
    </span>
  );
}

export function HeroSearch({ brands, modelsByBrand }: HeroSearchProps) {
  const router = useRouter();
  const [advanced, setAdvanced] = React.useState(false);
  const [brand, setBrand] = React.useState("");
  const [model, setModel] = React.useState("");
  const [priceMax, setPriceMax] = React.useState("");
  const [yearMin, setYearMin] = React.useState("");
  const [bodyType, setBodyType] = React.useState("");
  const [fuelType, setFuelType] = React.useState("");
  const [transmission, setTransmission] = React.useState("");

  const models = brand ? (modelsByBrand[brand] ?? []) : [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (brand) params.set("brand", brand);
    if (model) params.set("model", model);
    if (priceMax) params.set("priceMax", priceMax);
    if (yearMin) params.set("yearMin", yearMin);
    if (advanced) {
      if (bodyType) params.set("bodyType", bodyType);
      if (fuelType) params.set("fuelType", fuelType);
      if (transmission) params.set("transmission", transmission);
    }
    const qs = params.toString();
    router.push(qs ? `/vozila?${qs}` : "/vozila");
  }

  // Dark-on-navy select styling layered over the UI primitive.
  const selectCls =
    "h-12 border-white/15 bg-white/[0.06] text-white shadow-none focus-visible:border-accent focus-visible:ring-accent/30 [&>option]:text-foreground";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-navy-700/60 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-5"
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <label className="block">
          <FieldLabel>Marka</FieldLabel>
          <Select
            className={selectCls}
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value);
              setModel("");
            }}
            aria-label="Marka"
          >
            <option value="">Sve marke</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <FieldLabel>Model</FieldLabel>
          <Select
            className={selectCls}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={!brand}
            aria-label="Model"
          >
            <option value="">{brand ? "Svi modeli" : "Odaberi marku"}</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <FieldLabel>Cijena do</FieldLabel>
          <Select
            className={selectCls}
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            aria-label="Cijena do"
          >
            <option value="">Bez limita</option>
            {PRICE_STEPS.map((p) => (
              <option key={p} value={p}>
                do {new Intl.NumberFormat("de-DE").format(p)} €
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <FieldLabel>Godište od</FieldLabel>
          <Select
            className={selectCls}
            value={yearMin}
            onChange={(e) => setYearMin(e.target.value)}
            aria-label="Godište od"
          >
            <option value="">Sva godišta</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                od {y}.
              </option>
            ))}
          </Select>
        </label>
      </div>

      {advanced && (
        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-white/10 pt-3 animate-fade-in-up sm:grid-cols-3">
          <label className="block">
            <FieldLabel>Karoserija</FieldLabel>
            <Select
              className={selectCls}
              value={bodyType}
              onChange={(e) => setBodyType(e.target.value)}
              aria-label="Karoserija"
            >
              <option value="">Sve karoserije</option>
              {bodyOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="block">
            <FieldLabel>Gorivo</FieldLabel>
            <Select
              className={selectCls}
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              aria-label="Gorivo"
            >
              <option value="">Sva goriva</option>
              {fuelOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="block">
            <FieldLabel>Mjenjač</FieldLabel>
            <Select
              className={selectCls}
              value={transmission}
              onChange={(e) => setTransmission(e.target.value)}
              aria-label="Mjenjač"
            >
              <option value="">Svi mjenjači</option>
              {transmissionOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </label>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className="inline-flex items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
        >
          <SlidersHorizontal className="size-4" />
          Napredna pretraga
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              advanced && "rotate-180",
            )}
          />
        </button>

        <Button
          type="submit"
          variant="accent"
          size="lg"
          className="w-full sm:w-auto"
        >
          <Search className="size-5" />
          Pretraži ponudu
        </Button>
      </div>
    </form>
  );
}
