"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, Loader2 } from "lucide-react";
import type { LeadType } from "@prisma/client";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createLead } from "@/lib/actions/leads";

const TITLES: Record<LeadType, string> = {
  CONTACT: "Pošaljite upit",
  FINANCING: "Zatraži financiranje",
  VIEWING: "Zakaži razgledavanje",
};

const SUBTITLES: Record<LeadType, string> = {
  CONTACT: "Ostavite svoje podatke i javit ćemo vam se u najkraćem roku.",
  FINANCING:
    "Pošaljite zahtjev za financiranjem — odgovaramo unutar jednog radnog dana.",
  VIEWING: "Dogovorite termin za razgledavanje vozila u našem salonu.",
};

interface LeadFormProps {
  carId?: string;
  type: LeadType;
  triggerLabel: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
  triggerClassName?: string;
  triggerIcon?: React.ReactNode;
}

export function LeadForm({
  carId,
  type,
  triggerLabel,
  triggerVariant = "primary",
  triggerSize = "md",
  triggerClassName,
  triggerIcon,
}: LeadFormProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  function close() {
    setOpen(false);
    // reset after the close transition
    setTimeout(() => {
      setDone(false);
      setError(null);
    }, 200);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const form = e.currentTarget;
    const fd = new FormData(form);

    const result = await createLead({
      name: String(fd.get("name") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("email") ?? ""),
      message: String(fd.get("message") ?? ""),
      carId: carId ?? "",
      type,
    });

    setPending(false);

    if (result.ok) {
      setDone(true);
      form.reset();
    } else {
      setError(result.error);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        {triggerIcon}
        {triggerLabel}
      </Button>

      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
              role="dialog"
              aria-modal="true"
              aria-label={TITLES[type]}
            >
              <div
                className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
                onClick={close}
              />

              <div className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-surface shadow-xl animate-fade-in-up sm:max-w-md sm:rounded-2xl">
                <button
                  type="button"
                  onClick={close}
                  aria-label="Zatvori"
                  className="absolute right-3 top-3 grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  <X className="size-5" />
                </button>

                <div className="p-6 sm:p-7">
                  {done ? (
                    <div className="flex flex-col items-center py-6 text-center">
                      <CheckCircle2 className="size-14 text-success" />
                      <h2 className="mt-4 text-xl font-bold text-foreground">
                        Hvala na upitu!
                      </h2>
                      <p className="mt-2 text-sm text-muted">
                        Zaprimili smo vašu poruku i javit ćemo vam se u najkraćem
                        mogućem roku.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-6"
                        onClick={close}
                      >
                        Zatvori
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h2 className="pr-8 text-xl font-bold text-foreground">
                        {TITLES[type]}
                      </h2>
                      <p className="mt-1.5 text-sm text-muted">
                        {SUBTITLES[type]}
                      </p>

                      <form onSubmit={onSubmit} className="mt-5 space-y-4">
                        <div>
                          <Label htmlFor="lead-name">Ime i prezime *</Label>
                          <Input
                            id="lead-name"
                            name="name"
                            required
                            autoComplete="name"
                            placeholder="Vaše ime i prezime"
                          />
                        </div>

                        <div>
                          <Label htmlFor="lead-phone">Telefon *</Label>
                          <Input
                            id="lead-phone"
                            name="phone"
                            type="tel"
                            required
                            autoComplete="tel"
                            placeholder="+49 ..."
                          />
                        </div>

                        <div>
                          <Label htmlFor="lead-email">E-mail</Label>
                          <Input
                            id="lead-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            placeholder="vasa@adresa.com"
                          />
                        </div>

                        <div>
                          <Label htmlFor="lead-message">Poruka</Label>
                          <Textarea
                            id="lead-message"
                            name="message"
                            placeholder="Vaša poruka ili pitanje..."
                          />
                        </div>

                        {error && (
                          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                            {error}
                          </p>
                        )}

                        <Button
                          type="submit"
                          variant="accent"
                          size="lg"
                          className="w-full"
                          disabled={pending}
                        >
                          {pending && (
                            <Loader2 className="size-4 animate-spin" />
                          )}
                          {pending ? "Slanje..." : "Pošalji"}
                        </Button>

                        <p className="text-center text-xs text-muted">
                          Slanjem pristajete da vas kontaktiramo radi vašeg upita.
                        </p>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
