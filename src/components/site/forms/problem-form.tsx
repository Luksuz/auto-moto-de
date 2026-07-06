"use client";

import * as React from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLocale, useT } from "@/components/site/language-provider";
import { useLeadSubmit } from "@/components/site/forms/use-lead-submit";
import { composeWaMessage } from "@/lib/leads/compose";
import { DEALER } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Field, FormShell, PrivacyNote } from "./form-shell";
import { WhatsAppIcon } from "@/components/site/icons";

const INPUT = "bg-background border-border-strong";

export function ProblemForm() {
  const t = useT();
  const locale = useLocale();
  const { submit, pending } = useLeadSubmit();
  const [problemType, setProblemType] = React.useState<string | null>(null);
  const [typeError, setTypeError] = React.useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!problemType) {
      setTypeError(true);
      return;
    }
    const fd = new FormData(e.currentTarget);
    const v = (name: string) => String(fd.get(name) ?? "").trim();

    const message = composeWaMessage(
      locale === "de"
        ? "PROBLEMMELDUNG — AUTOCAR EU"
        : "PRIJAVA PROBLEMA — AUTOCAR EU",
      [
        [t.fName, v("ime")],
        [t.fPhone, v("telefon")],
        ["E-mail", v("email")],
        [t.pBrand, v("marka")],
        [t.pModel, v("model")],
        [t.fYear, v("godiste")],
        [t.pPlate, v("registracija")],
        [t.mileage, v("km")],
        [t.pDate, v("datum")],
        [t.pType, problemType],
        [t.pDesc, v("opis")],
      ],
    );

    void submit({
      type: "PROBLEM",
      name: v("ime"),
      phone: v("telefon"),
      email: v("email"),
      message,
      waNumber: DEALER.whatsappDe,
    });
  }

  return (
    <FormShell title={t.probFormTitle}>
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
          <Field label={t.fYear}>
            <Input
              name="godiste"
              inputMode="numeric"
              placeholder="2021"
              className={INPUT}
            />
          </Field>
          <Field label={t.pPlate}>
            <Input
              name="registracija"
              placeholder="ZG-0000-AA"
              className={INPUT}
            />
          </Field>
          <Field label={t.mileage}>
            <Input name="km" placeholder="120.000 km" className={INPUT} />
          </Field>
          <Field label={t.pDate}>
            <Input
              name="datum"
              type="date"
              className={cn(INPUT, "[color-scheme:dark]")}
            />
          </Field>
        </div>

        <div className="mt-5">
          <div className="mb-2.5 text-[12px] font-bold uppercase tracking-[1.5px] text-muted">
            {t.pType} *
          </div>
          <div className="flex flex-wrap gap-2.5">
            {t.probTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setTypeError(false);
                  setProblemType((current) => (current === type ? null : type));
                }}
                className={cn(
                  "cursor-pointer rounded-full border px-5 py-2.5 text-[14px] font-semibold transition-colors",
                  problemType === type
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border-strong bg-transparent text-muted hover:border-primary",
                )}
              >
                {type}
              </button>
            ))}
          </div>
          {typeError && (
            <p className="mt-2.5 text-[13.5px] text-error">{t.pTypeRequired}</p>
          )}
        </div>

        <Field label={t.pDesc} required className="mt-5">
          <Textarea
            name="opis"
            rows={4}
            required
            maxLength={6000}
            placeholder={t.pDescPh}
            className={INPUT}
          />
        </Field>

        <div className="mt-5 border border-dashed border-border-strong p-[22px] text-center text-[14px] text-muted-2">
          <Camera className="mr-2 inline-block size-4 align-[-3px] text-muted-2" />
          {t.pPhotos}
        </div>

        <PrivacyNote text={t.privacy} />

        <Button
          type="submit"
          variant="whatsapp"
          size="lg"
          className="w-full"
          disabled={pending}
        >
          <WhatsAppIcon className="size-4" />
          {(pending ? t.sending : t.probSend) + " →"}
        </Button>
        <p className="mt-3 text-center text-[13.5px] text-muted-2">
          {t.respond}
        </p>
      </form>
    </FormShell>
  );
}
