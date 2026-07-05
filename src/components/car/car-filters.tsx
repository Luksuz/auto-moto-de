"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT, useLocale } from "@/components/site/language-provider";
import {
  BODY_TYPE_LABEL_I18N,
  FUEL_LABEL_I18N,
  TRANSMISSION_LABEL_I18N,
} from "@/lib/i18n/dictionary";

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

const PARAM_KEYS = [
  "brand",
  "model",
  "yearMin",
  "yearMax",
  "priceMin",
  "priceMax",
  "bodyType",
  "fuelType",
  "transmission",
  "seats",
  "sort",
] as const;

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - i);

const LABEL_CLASS =
  "text-[11px] font-bold uppercase tracking-[1.5px] text-muted-2";
const FIELD_CLASS = "bg-background border-border-strong";

function normalize(values: CarFiltersValues): Required<CarFiltersValues> {
  return {
    brand: values.brand ?? "",
    model: values.model ?? "",
    bodyType: values.bodyType ?? "",
    fuelType: values.fuelType ?? "",
    transmission: values.transmission ?? "",
    seats: values.seats ?? "",
    yearMin: values.yearMin ?? "",
    yearMax: values.yearMax ?? "",
    priceMin: values.priceMin ?? "",
    priceMax: values.priceMax ?? "",
    sort: values.sort ?? "newest",
  };
}

export function CarFilters({
  brands,
  modelsByBrand,
  initial,
}: CarFiltersProps) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();

  const [values, setValues] = React.useState(() => normalize(initial));
  const applied = React.useRef(values);
  const [showAdvanced, setShowAdvanced] = React.useState(
    Boolean(
      initial.bodyType ||
        initial.fuelType ||
        initial.transmission ||
        initial.seats ||
        initial.yearMax ||
        initial.priceMin,
    ),
  );

  const models = values.brand ? (modelsByBrand[values.brand] ?? []) : [];

  function push(next: Required<CarFiltersValues>) {
    applied.current = next;
    const params = new URLSearchParams();
    for (const key of PARAM_KEYS) {
      const v = next[key].trim();
      if (!v) continue;
      // "newest" is the default sort — keep the URL clean.
      if (key === "sort" && v === "newest") continue;
      params.set(key, v);
    }
    // page resets to 1 on any filter change
    params.delete("page");
    router.push(`/vozila${params.toString() ? `?${params}` : ""}`);
  }

  /** Apply a change immediately (selects). */
  function apply(patch: Partial<CarFiltersValues>) {
    const next = { ...values, ...patch } as Required<CarFiltersValues>;
    setValues(next);
    push(next);
  }

  /** Update state without navigating (number inputs while typing). */
  function stage(patch: Partial<CarFiltersValues>) {
    setValues((prev) => ({ ...prev, ...patch }) as Required<CarFiltersValues>);
  }

  /** Commit staged number-input values on blur / Enter. */
  function commit() {
    if (
      values.priceMin !== applied.current.priceMin ||
      values.priceMax !== applied.current.priceMax
    ) {
      push(values);
    }
  }

  function onPriceKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  }

  function reset() {
    const next = normalize({});
    setValues(next);
    applied.current = next;
    setShowAdvanced(false);
    router.push("/vozila");
  }

  return (
    <div className="border border-border bg-surface p-[18px]">
      <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-3 lg:[grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        {/* Marka */}
        <div>
          <Label htmlFor="f-brand" className={LABEL_CLASS}>
            {t.filtBrand}
          </Label>
          <Select
            id="f-brand"
            className={FIELD_CLASS}
            value={values.brand}
            onChange={(e) => apply({ brand: e.target.value, model: "" })}
          >
            <option value="">{t.filtAllBrands}</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </div>

        {/* Model */}
        <div>
          <Label htmlFor="f-model" className={LABEL_CLASS}>
            {t.filtModel}
          </Label>
          <Select
            id="f-model"
            className={FIELD_CLASS}
            value={values.model}
            onChange={(e) => apply({ model: e.target.value })}
            disabled={!values.brand}
          >
            <option value="">{t.filtAllModels}</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>

        {/* Gorivo */}
        <div>
          <Label htmlFor="f-fuel" className={LABEL_CLASS}>
            {t.filtFuel}
          </Label>
          <Select
            id="f-fuel"
            className={FIELD_CLASS}
            value={values.fuelType}
            onChange={(e) => apply({ fuelType: e.target.value })}
          >
            <option value="">{t.filtAll}</option>
            {Object.entries(FUEL_LABEL_I18N[locale]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {/* Mjenjač */}
        <div>
          <Label htmlFor="f-trans" className={LABEL_CLASS}>
            {t.filtGear}
          </Label>
          <Select
            id="f-trans"
            className={FIELD_CLASS}
            value={values.transmission}
            onChange={(e) => apply({ transmission: e.target.value })}
          >
            <option value="">{t.filtAll}</option>
            {Object.entries(TRANSMISSION_LABEL_I18N[locale]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </Select>
        </div>

        {/* Godište od */}
        <div>
          <Label htmlFor="f-year-min" className={LABEL_CLASS}>
            {t.filtYearFrom}
          </Label>
          <Select
            id="f-year-min"
            className={FIELD_CLASS}
            value={values.yearMin}
            onChange={(e) => apply({ yearMin: e.target.value })}
          >
            <option value="">{t.filtAll}</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>

        {/* Cijena do */}
        <div>
          <Label htmlFor="f-price-max" className={LABEL_CLASS}>
            {t.filtPriceTo}
          </Label>
          <Input
            id="f-price-max"
            className={FIELD_CLASS}
            type="number"
            min={0}
            step={500}
            inputMode="numeric"
            placeholder="€"
            value={values.priceMax}
            onChange={(e) => stage({ priceMax: e.target.value })}
            onBlur={commit}
            onKeyDown={onPriceKeyDown}
          />
        </div>

        {/* Sortiraj */}
        <div>
          <Label htmlFor="f-sort" className={LABEL_CLASS}>
            {t.filtSort}
          </Label>
          <Select
            id="f-sort"
            className={FIELD_CLASS}
            value={values.sort}
            onChange={(e) => apply({ sort: e.target.value })}
          >
            <option value="newest">{t.sortNew}</option>
            <option value="price-asc">{t.sortPriceAsc}</option>
            <option value="price-desc">{t.sortPriceDesc}</option>
            <option value="km-asc">{t.sortKmAsc}</option>
          </Select>
        </div>

        {/* Reset */}
        <Button type="button" variant="goldOutline" onClick={reset}>
          {t.filtReset}
        </Button>

        {showAdvanced && (
          <>
            {/* Godište do */}
            <div>
              <Label htmlFor="f-year-max" className={LABEL_CLASS}>
                {t.filtYearTo}
              </Label>
              <Select
                id="f-year-max"
                className={FIELD_CLASS}
                value={values.yearMax}
                onChange={(e) => apply({ yearMax: e.target.value })}
              >
                <option value="">{t.filtAll}</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>

            {/* Cijena od */}
            <div>
              <Label htmlFor="f-price-min" className={LABEL_CLASS}>
                {t.filtPriceFrom}
              </Label>
              <Input
                id="f-price-min"
                className={FIELD_CLASS}
                type="number"
                min={0}
                step={500}
                inputMode="numeric"
                placeholder="€"
                value={values.priceMin}
                onChange={(e) => stage({ priceMin: e.target.value })}
                onBlur={commit}
                onKeyDown={onPriceKeyDown}
              />
            </div>

            {/* Karoserija */}
            <div>
              <Label htmlFor="f-body" className={LABEL_CLASS}>
                {t.filtBody}
              </Label>
              <Select
                id="f-body"
                className={FIELD_CLASS}
                value={values.bodyType}
                onChange={(e) => apply({ bodyType: e.target.value })}
              >
                <option value="">{t.filtAll}</option>
                {Object.entries(BODY_TYPE_LABEL_I18N[locale]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </Select>
            </div>

            {/* Broj sjedišta */}
            <div>
              <Label htmlFor="f-seats" className={LABEL_CLASS}>
                {t.filtSeats}
              </Label>
              <Select
                id="f-seats"
                className={FIELD_CLASS}
                value={values.seats}
                onChange={(e) => apply({ seats: e.target.value })}
              >
                <option value="">{t.filtAll}</option>
                {[2, 4, 5, 6, 7, 8, 9].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          </>
        )}
      </div>

      <div className="mt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-[11px] font-bold uppercase tracking-[1.5px] text-muted-2 hover:text-foreground"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          <SlidersHorizontal className="size-4" />
          {showAdvanced ? t.lessFilters : t.moreFilters}
        </Button>
      </div>
    </div>
  );
}
