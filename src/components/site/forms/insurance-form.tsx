"use client";

import * as React from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLocale, useT } from "@/components/site/language-provider";
import { useLeadSubmit } from "@/components/site/forms/use-lead-submit";
import { composeWaMessage } from "@/lib/leads/compose";
import { INSURANCE_ADVISOR } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Field, FormShell, PrivacyNote } from "./form-shell";

const INPUT = "bg-background border-border-strong";

export function InsuranceForm() {
  const t = useT();
  const locale = useLocale();
  const { submit, pending } = useLeadSubmit();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const waNumber =
      submitter?.value === "at"
        ? INSURANCE_ADVISOR.whatsappAt
        : INSURANCE_ADVISOR.whatsappDe;

    const fd = new FormData(e.currentTarget);
    const v = (name: string) => String(fd.get(name) ?? "").trim();

    const message = composeWaMessage(
      locale === "de"
        ? "VERSICHERUNGSANFRAGE — AUTOCAR EU"
        : "UPIT ZA OSIGURANJE — AUTOCAR EU",
      [
        [t.fName, v("ime")],
        [t.fPhone, v("telefon")],
        ["E-mail", v("email")],
        [t.pBrand, v("marka")],
        [t.pModel, v("model")],
        [t.fYear, v("godiste")],
        [t.insType, v("tip")],
        [t.pPlate, v("registracija")],
        [t.insKm, v("km")],
        [t.insStart, v("pocetak")],
        [t.fNote, v("napomena")],
      ],
    );

    void submit({
      type: "INSURANCE",
      name: v("ime"),
      phone: v("telefon"),
      email: v("email"),
      message,
      waNumber,
    });
  }

  return (
    <FormShell title={t.insFormTitle}>
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
          <Field label={t.pBrand} required>
            <Input
              name="marka"
              required
              placeholder="BMW, VW, Audi…"
              className={INPUT}
            />
          </Field>
          <Field label={t.pModel} required>
            <Input
              name="model"
              required
              placeholder="320d, Golf 8…"
              className={INPUT}
            />
          </Field>
          <Field label={t.fYear} required>
            <Input
              name="godiste"
              required
              inputMode="numeric"
              placeholder="2021"
              className={INPUT}
            />
          </Field>
          <Field label={t.insType} required>
            <Select name="tip" required className={INPUT}>
              <option value={t.insTypeAO}>{t.insTypeAO}</option>
              <option value={t.insTypeKasko}>{t.insTypeKasko}</option>
              <option value={t.insTypeBoth}>{t.insTypeBoth}</option>
            </Select>
          </Field>
          <Field label={t.pPlate}>
            <Input
              name="registracija"
              placeholder="M-XX-1234"
              className={INPUT}
            />
          </Field>
          <Field label={t.insKm}>
            <Input name="km" placeholder="15.000 km" className={INPUT} />
          </Field>
          <Field label={t.insStart}>
            <Input
              name="pocetak"
              type="date"
              className={cn(INPUT, "[color-scheme:dark]")}
            />
          </Field>
          <Field label={t.fNote} className="col-span-full">
            <Input name="napomena" placeholder={t.fNotePh} className={INPUT} />
          </Field>
        </div>

        <PrivacyNote text={t.privacy} />

        <div className="grid grid-cols-2 gap-3">
          <Button
            type="submit"
            name="wa"
            value="de"
            variant="whatsapp"
            size="lg"
            className="h-auto w-full whitespace-normal py-3.5"
            disabled={pending}
          >
            <Phone />
            {t.insSendDe}
          </Button>
          <Button
            type="submit"
            name="wa"
            value="at"
            variant="whatsappDark"
            size="lg"
            className="h-auto w-full whitespace-normal py-3.5"
            disabled={pending}
          >
            <Phone />
            {t.insSendAt}
          </Button>
        </div>
        <p className="mt-3 text-center text-[13.5px] text-muted-2">
          {t.respond}
        </p>
      </form>
    </FormShell>
  );
}
