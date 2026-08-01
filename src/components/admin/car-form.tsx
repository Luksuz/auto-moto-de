"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BODY_TYPE_LABEL,
  FUEL_TYPE_LABEL,
  TRANSMISSION_LABEL,
  toOptions,
} from "@/lib/constants";
import { createCar, updateCar } from "@/lib/actions/cars";
import type { CarInput } from "@/lib/validators";
import {
  ImageManager,
  type ManagedImage,
} from "@/components/admin/image-manager";
import { AiDescription } from "@/components/admin/ai-description";

export type CarFormValues = {
  title: string;
  brand: string;
  model: string;
  priceEur: string;
  featured: boolean;
  assignedAgentId: string;
  bodyType: string;
  firstRegistration: string;
  mileageKm: string;
  fuelType: string;
  powerKw: string;
  powerKs: string;
  transmission: string;
  engineCcm: string;
  doors: string;
  seats: string;
  airConditioning: string;
  parkingSensors: string;
  tuv: string;
  emissionClass: string;
  origin: string;
  previousOwners: string;
  description: string;
  warranty: string;
  originDetails: string;
};

const EMPTY: CarFormValues = {
  title: "",
  brand: "",
  model: "",
  priceEur: "",
  featured: false,
  assignedAgentId: "",
  bodyType: "LIMUZINA",
  firstRegistration: "",
  mileageKm: "",
  fuelType: "DIESEL",
  powerKw: "",
  powerKs: "",
  transmission: "MANUALNI",
  engineCcm: "",
  doors: "",
  seats: "",
  airConditioning: "",
  parkingSensors: "",
  tuv: "",
  emissionClass: "",
  origin: "",
  previousOwners: "",
  description: "",
  warranty: "",
  originDetails: "",
};

function Field({
  label,
  htmlFor,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label
        htmlFor={htmlFor}
        className="text-[12px] font-bold uppercase tracking-[1.5px] text-muted mb-2"
      >
        {label}
        {required && <span className="text-error"> *</span>}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}

export function CarForm({
  carId,
  initialValues,
  initialEquipment = [],
  initialImages = [],
  agents,
}: {
  carId?: string;
  initialValues?: Partial<CarFormValues>;
  initialEquipment?: string[];
  initialImages?: ManagedImage[];
  agents: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<CarFormValues>({
    ...EMPTY,
    ...initialValues,
  });
  const [equipment, setEquipment] = useState<string[]>(initialEquipment);
  const [equipInput, setEquipInput] = useState("");
  const [images, setImages] = useState<ManagedImage[]>(initialImages);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof CarFormValues>(key: K, value: CarFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function onTitleChange(value: string) {
    setValues((v) => ({ ...v, title: value }));
  }

  function addEquip(raw: string) {
    const item = raw.trim();
    if (!item) return;
    if (!equipment.includes(item)) setEquipment((e) => [...e, item]);
    setEquipInput("");
  }

  function removeEquip(item: string) {
    setEquipment((e) => e.filter((x) => x !== item));
  }

  const aiContext = useMemo(
    () => ({
      title: values.title,
      brand: values.brand,
      model: values.model,
      firstRegistration: values.firstRegistration,
      fuelType: values.fuelType,
      transmission: values.transmission,
      powerKs: values.powerKs,
      powerKw: values.powerKw,
      mileageKm: values.mileageKm,
      bodyType: values.bodyType,
      priceEur: values.priceEur,
      equipment,
    }),
    [values, equipment],
  );

  function buildPayload(): CarInput {
    return {
      ...values,
      equipment,
      images,
    } as CarInput;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const payload = buildPayload();
      const result = carId
        ? await updateCar(carId, payload)
        : await createCar(payload);
      // createCar redirects on success and never returns a value.
      if (result && !result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error ?? "Provjerite unesene podatke.");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (result?.ok) {
        router.refresh();
      }
    });
  }

  const agentOptions = agents.map((a) => ({ value: a.id, label: a.name }));

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {formError && (
        <div className="border border-error/40 bg-surface-2 px-4 py-3 text-sm text-error">
          {formError}
        </div>
      )}

      {/* Osnovno */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display uppercase tracking-[2px]">Osnovno</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Naslov" htmlFor="title" required error={errors.title}>
              <Input className="bg-background border-border-strong"
                id="title"
                value={values.title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="npr. BMW 320d Touring Sport Line"
              />
            </Field>
          </div>
          <Field label="Marka" htmlFor="brand" required error={errors.brand}>
            <Input className="bg-background border-border-strong"
              id="brand"
              value={values.brand}
              onChange={(e) => set("brand", e.target.value)}
              placeholder="BMW"
            />
          </Field>
          <Field label="Model" htmlFor="model" required error={errors.model}>
            <Input className="bg-background border-border-strong"
              id="model"
              value={values.model}
              onChange={(e) => set("model", e.target.value)}
              placeholder="320d"
            />
          </Field>
          <Field
            label="Cijena (EUR)"
            htmlFor="priceEur"
            required
            error={errors.priceEur}
          >
            <Input className="bg-background border-border-strong"
              id="priceEur"
              type="number"
              min={0}
              value={values.priceEur}
              onChange={(e) => set("priceEur", e.target.value)}
              placeholder="25990"
            />
          </Field>
          <Field label="Dodijeljeni agent" htmlFor="agent" error={errors.assignedAgentId}>
            <Select className="bg-background border-border-strong"
              id="agent"
              value={values.assignedAgentId}
              onChange={(e) => set("assignedAgentId", e.target.value)}
            >
              <option value="">— Nije dodijeljen —</option>
              {agentOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-6">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={values.featured}
                onChange={(e) => set("featured", e.target.checked)}
              />
              Izdvojeno
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Tehnički detalji */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display uppercase tracking-[2px]">Tehnički detalji</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Karoserija" htmlFor="bodyType" required error={errors.bodyType}>
            <Select className="bg-background border-border-strong"
              id="bodyType"
              value={values.bodyType}
              onChange={(e) => set("bodyType", e.target.value)}
            >
              {toOptions(BODY_TYPE_LABEL).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Prva registracija (MM/GGGG)"
            htmlFor="firstRegistration"
            required
            error={errors.firstRegistration}
          >
            <Input className="bg-background border-border-strong"
              id="firstRegistration"
              value={values.firstRegistration}
              onChange={(e) => set("firstRegistration", e.target.value)}
              placeholder="06/2019"
            />
          </Field>
          <Field label="Kilometraža (km)" htmlFor="mileageKm" required error={errors.mileageKm}>
            <Input className="bg-background border-border-strong"
              id="mileageKm"
              type="number"
              min={0}
              value={values.mileageKm}
              onChange={(e) => set("mileageKm", e.target.value)}
              placeholder="76000"
            />
          </Field>
          <Field label="Gorivo" htmlFor="fuelType" required error={errors.fuelType}>
            <Select className="bg-background border-border-strong"
              id="fuelType"
              value={values.fuelType}
              onChange={(e) => set("fuelType", e.target.value)}
            >
              {toOptions(FUEL_TYPE_LABEL).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mjenjač" htmlFor="transmission" required error={errors.transmission}>
            <Select className="bg-background border-border-strong"
              id="transmission"
              value={values.transmission}
              onChange={(e) => set("transmission", e.target.value)}
            >
              {toOptions(TRANSMISSION_LABEL).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Snaga (kW)" htmlFor="powerKw" required error={errors.powerKw}>
            <Input className="bg-background border-border-strong"
              id="powerKw"
              type="number"
              min={0}
              value={values.powerKw}
              onChange={(e) => set("powerKw", e.target.value)}
              placeholder="140"
            />
          </Field>
          <Field label="Snaga (KS)" htmlFor="powerKs" required error={errors.powerKs}>
            <Input className="bg-background border-border-strong"
              id="powerKs"
              type="number"
              min={0}
              value={values.powerKs}
              onChange={(e) => set("powerKs", e.target.value)}
              placeholder="190"
            />
          </Field>
          <Field label="Zapremnina (ccm)" htmlFor="engineCcm" error={errors.engineCcm}>
            <Input className="bg-background border-border-strong"
              id="engineCcm"
              type="number"
              min={0}
              value={values.engineCcm}
              onChange={(e) => set("engineCcm", e.target.value)}
              placeholder="1995"
            />
          </Field>
          <Field label="Broj vrata" htmlFor="doors" error={errors.doors}>
            <Input className="bg-background border-border-strong"
              id="doors"
              value={values.doors}
              onChange={(e) => set("doors", e.target.value)}
              placeholder="4/5"
            />
          </Field>
          <Field label="Broj sjedala" htmlFor="seats" error={errors.seats}>
            <Input className="bg-background border-border-strong"
              id="seats"
              type="number"
              min={0}
              value={values.seats}
              onChange={(e) => set("seats", e.target.value)}
              placeholder="5"
            />
          </Field>
          <Field label="Klima" htmlFor="airConditioning" error={errors.airConditioning}>
            <Input className="bg-background border-border-strong"
              id="airConditioning"
              value={values.airConditioning}
              onChange={(e) => set("airConditioning", e.target.value)}
              placeholder="Automatska, 2 zone"
            />
          </Field>
          <Field label="Parkirni senzori" htmlFor="parkingSensors" error={errors.parkingSensors}>
            <Input className="bg-background border-border-strong"
              id="parkingSensors"
              value={values.parkingSensors}
              onChange={(e) => set("parkingSensors", e.target.value)}
              placeholder="Kamera, prednji, stražnji"
            />
          </Field>
          <Field label="TÜV do" htmlFor="tuv" error={errors.tuv}>
            <Input className="bg-background border-border-strong"
              id="tuv"
              value={values.tuv}
              onChange={(e) => set("tuv", e.target.value)}
              placeholder="06/2026"
            />
          </Field>
          <Field label="Emisijska klasa" htmlFor="emissionClass" error={errors.emissionClass}>
            <Input className="bg-background border-border-strong"
              id="emissionClass"
              value={values.emissionClass}
              onChange={(e) => set("emissionClass", e.target.value)}
              placeholder="Euro 6"
            />
          </Field>
          <Field label="Porijeklo" htmlFor="origin" error={errors.origin}>
            <Input className="bg-background border-border-strong"
              id="origin"
              value={values.origin}
              onChange={(e) => set("origin", e.target.value)}
              placeholder="EU porijeklo"
            />
          </Field>
          <Field label="Broj vlasnika" htmlFor="previousOwners" error={errors.previousOwners}>
            <Input className="bg-background border-border-strong"
              id="previousOwners"
              type="number"
              min={0}
              value={values.previousOwners}
              onChange={(e) => set("previousOwners", e.target.value)}
              placeholder="1"
            />
          </Field>
        </CardContent>
      </Card>

      {/* Oprema */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display uppercase tracking-[2px]">Oprema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input className="bg-background border-border-strong"
            value={equipInput}
            onChange={(e) => setEquipInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addEquip(equipInput);
              }
            }}
            placeholder="Upišite stavku opreme i pritisnite Enter"
          />
          {equipment.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {equipment.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-sm"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => removeEquip(item)}
                    className="text-muted hover:text-error"
                    aria-label={`Ukloni ${item}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slike */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display uppercase tracking-[2px]">Slike</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageManager images={images} onChange={setImages} />
        </CardContent>
      </Card>

      {/* Opisi */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display uppercase tracking-[2px]">Opisi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AiDescription
            images={images}
            context={aiContext}
            onResult={(text) => set("description", text)}
          />
          <Field label="Opis" htmlFor="description" error={errors.description}>
            <Textarea className="bg-background border-border-strong"
              id="description"
              rows={8}
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Detaljan opis vozila..."
            />
          </Field>
          <Field label="Garancija" htmlFor="warranty" error={errors.warranty}>
            <Textarea className="bg-background border-border-strong"
              id="warranty"
              rows={4}
              value={values.warranty}
              onChange={(e) => set("warranty", e.target.value)}
            />
          </Field>
          <Field label="Porijeklo vozila" htmlFor="originDetails" error={errors.originDetails}>
            <Textarea className="bg-background border-border-strong"
              id="originDetails"
              rows={4}
              value={values.originDetails}
              onChange={(e) => set("originDetails", e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/vozila")}
        >
          Odustani
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={pending}
          className="font-display uppercase tracking-[2px]"
        >
          <Save className="size-4" />
          {pending ? "Spremanje..." : carId ? "Spremi promjene" : "Spremi vozilo"}
        </Button>
      </div>
    </form>
  );
}
