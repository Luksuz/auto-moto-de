"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BODY_TYPE_LABEL,
  FUEL_TYPE_LABEL,
  TRANSMISSION_LABEL,
  toOptions,
} from "@/lib/constants";

export interface CarFiltersValues {
  brand?: string;
  model?: string;
  bodyType?: string;
  fuelType?: string;
  transmission?: string;
  seats?: string;
  yearMin?: string;
  yearMax?: string;
  priceMin?: string;
  priceMax?: string;
  sort?: string;
}

interface CarFiltersProps {
  brands: string[];
  modelsByBrand: Record<string, string[]>;
  initial: CarFiltersValues;
}

const SORT_OPTIONS = [
  { value: "newest", label: "Zadano (najnovije)" },
  { value: "price-asc", label: "Cijena: rastuće" },
  { value: "price-desc", label: "Cijena: padajuće" },
  { value: "km-asc", label: "Kilometraža: rastuće" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - i);

export function CarFilters({
  brands,
  modelsByBrand,
  initial,
}: CarFiltersProps) {
  const router = useRouter();
  const [brand, setBrand] = React.useState(initial.brand ?? "");
  const [model, setModel] = React.useState(initial.model ?? "");
  const [showAdvanced, setShowAdvanced] = React.useState(
    Boolean(
      initial.bodyType ||
        initial.fuelType ||
        initial.transmission ||
        initial.seats,
    ),
  );

  const models = brand ? (modelsByBrand[brand] ?? []) : [];

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of fd.entries()) {
      const v = String(value).trim();
      if (v) params.set(key, v);
    }
    // page resets to 1 on new filter
    params.delete("page");
    router.push(`/vozila${params.toString() ? `?${params}` : ""}`);
  }

  function reset() {
    setBrand("");
    setModel("");
    setShowAdvanced(false);
    router.push("/vozila");
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Marka */}
        <div>
          <Label htmlFor="f-brand">Marka</Label>
          <Select
            id="f-brand"
            name="brand"
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value);
              setModel("");
            }}
          >
            <option value="">Sve marke</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </div>

        {/* Model */}
        <div>
          <Label htmlFor="f-model">Model</Label>
          <Select
            id="f-model"
            name="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={!brand}
          >
            <option value="">Svi modeli</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>

        {/* Godište */}
        <div>
          <Label>Godište (od / do)</Label>
          <div className="flex gap-2">
            <Select name="yearMin" defaultValue={initial.yearMin ?? ""} aria-label="Godište od">
              <option value="">Od</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
            <Select name="yearMax" defaultValue={initial.yearMax ?? ""} aria-label="Godište do">
              <option value="">Do</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Cijena */}
        <div>
          <Label>Cijena € (od / do)</Label>
          <div className="flex gap-2">
            <Input
              name="priceMin"
              type="number"
              min={0}
              step={500}
              inputMode="numeric"
              placeholder="Od"
              defaultValue={initial.priceMin ?? ""}
              aria-label="Cijena od"
            />
            <Input
              name="priceMax"
              type="number"
              min={0}
              step={500}
              inputMode="numeric"
              placeholder="Do"
              defaultValue={initial.priceMax ?? ""}
              aria-label="Cijena do"
            />
          </div>
        </div>
      </div>

      {showAdvanced && (
        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="f-body">Vrsta karoserije</Label>
            <Select id="f-body" name="bodyType" defaultValue={initial.bodyType ?? ""}>
              <option value="">Sve</option>
              {toOptions(BODY_TYPE_LABEL).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="f-fuel">Vrsta goriva</Label>
            <Select id="f-fuel" name="fuelType" defaultValue={initial.fuelType ?? ""}>
              <option value="">Sve</option>
              {toOptions(FUEL_TYPE_LABEL).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="f-trans">Vrsta mjenjača</Label>
            <Select
              id="f-trans"
              name="transmission"
              defaultValue={initial.transmission ?? ""}
            >
              <option value="">Sve</option>
              {toOptions(TRANSMISSION_LABEL).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="f-seats">Broj sjedišta</Label>
            <Select id="f-seats" name="seats" defaultValue={initial.seats ?? ""}>
              <option value="">Sve</option>
              {[2, 4, 5, 6, 7, 8, 9].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            <SlidersHorizontal className="size-4" />
            {showAdvanced ? "Manje filtera" : "Više filtera"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            <X className="size-4" />
            Poništi
          </Button>
        </div>

        <div className="flex items-end gap-2">
          <div className="min-w-[200px]">
            <Label htmlFor="f-sort">Sortiranje</Label>
            <Select id="f-sort" name="sort" defaultValue={initial.sort ?? "newest"}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="primary">
            <Search className="size-4" />
            Pretraži
          </Button>
        </div>
      </div>
    </form>
  );
}
