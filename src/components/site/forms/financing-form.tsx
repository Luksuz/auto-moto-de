"use client";

import * as React from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLocale, useT } from "@/components/site/language-provider";
import { useLeadSubmit } from "@/components/site/forms/use-lead-submit";
import { composeWaMessage } from "@/lib/leads/compose";
import { DEALER } from "@/lib/constants";
import { Field, FormShell, PrivacyNote } from "./form-shell";

const INPUT = "bg-background border-border-strong";
const LOAN_TERMS = ["12", "24", "36", "48", "60", "72", "84"];

interface FinancingFormProps {
  carId?: string;
  vehicle?: string;
  year?: string;
  price?: string;
}

export function FinancingForm({
  carId,
  vehicle,
  year,
  price,
}: FinancingFormProps) {
  const t = useT();
  const locale = useLocale();
  const { submit, pending } = useLeadSubmit();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v = (name: string) => String(fd.get(name) ?? "").trim();
    const cijena = v("cijena");
    const kredit = v("kredit");

    const message = composeWaMessage(
      locale === "de"
        ? "FINANZIERUNGSANFRAGE — AUTOCAR EU"
        : "UPIT ZA FINANCIRANJE — AUTOCAR EU",
      [
        [t.fName, v("ime")],
        [t.fPhone, v("telefon")],
        ["E-mail", v("email")],
        [t.fVehicle, v("vozilo")],
        [t.fYear, v("godiste")],
        [t.fPrice, cijena && `${cijena} EUR`],
        [t.fLoan, kredit && `${kredit} EUR`],
        [t.fTerm, v("rok")],
        [t.fNote, v("napomena")],
      ],
    );

    void submit({
      type: "FINANCING",
      name: v("ime"),
      phone: v("telefon"),
      email: v("email"),
      message,
      carId,
      waNumber: DEALER.whatsappDe,
    });
  }

  return (
    <FormShell title={t.finFormTitle}>
      <form onSubmit={onSubmit}>
        <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
          <Field label={t.fName} required>
            <Input
              name="ime"
              required
              minLength={2}
              autoComplete="name"
              placeholder={t.fNamePh}
              className={INPUT}
            />
          </Field>
          <Field label={t.fPhone} required>
            <Input
              name="telefon"
              type="tel"
              required
              minLength={6}
              autoComplete="tel"
              placeholder={t.fPhonePh}
              className={INPUT}
            />
          </Field>
          <Field label="E-mail">
            <Input
              name="email"
              type="email"
              autoComplete="email"
              placeholder={t.fEmailPh}
              className={INPUT}
            />
          </Field>
          <Field label={t.fVehicle}>
            <Input
              name="vozilo"
              defaultValue={vehicle}
              placeholder={t.fVehiclePh}
              className={INPUT}
            />
          </Field>
          <Field label={t.fYear}>
            <Input
              name="godiste"
              inputMode="numeric"
              defaultValue={year}
              placeholder="2021"
              className={INPUT}
            />
          </Field>
          <Field label={`${t.fPrice} (EUR)`}>
            <Input
              name="cijena"
              inputMode="numeric"
              defaultValue={price}
              placeholder="20.000"
              className={INPUT}
            />
          </Field>
          <Field label={`${t.fLoan} (EUR)`}>
            <Input
              name="kredit"
              inputMode="numeric"
              placeholder="15.000"
              className={INPUT}
            />
          </Field>
          <Field label={t.fTerm} className="col-span-full">
            <Select name="rok" className={INPUT}>
              {LOAN_TERMS.map((term) => (
                <option key={term} value={term}>
                  {term}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.fNote} className="col-span-full">
            <Textarea
              name="napomena"
              rows={3}
              placeholder={t.fNotePh}
              className={INPUT}
            />
          </Field>
        </div>

        <PrivacyNote text={t.privacy} />

        <Button
          type="submit"
          variant="whatsapp"
          size="lg"
          className="w-full"
          disabled={pending}
        >
          <Phone />
          {(pending ? t.sending : t.finSend) + " →"}
        </Button>
        <p className="mt-3 text-center text-[13.5px] text-muted-2">
          {t.respond}
        </p>
      </form>
    </FormShell>
  );
}
