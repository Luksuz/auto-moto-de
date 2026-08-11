"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSource } from "@/lib/actions/sources";
import { cn } from "@/lib/utils";

export function SourceCreateForm({
  country = "DE",
  disabled = false,
  disabledNote,
  urlPlaceholder = "https://home.mobile.de/AUTOHAUSKUCURGMBH",
  urlLabel = "Poveznica na mobile.de",
}: {
  country?: "DE" | "AT";
  /** Renders the whole form read-only. The market exists in the data model but
   *  the scraper cannot read it yet, so accepting a source would queue a job
   *  that fails every six hours forever. */
  disabled?: boolean;
  disabledNote?: string;
  urlPlaceholder?: string;
  urlLabel?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createSource(fd);
      if (res.ok) {
        setSuccess(true);
        formRef.current?.reset();
        router.refresh();
      } else {
        setError(res.error ?? "Greška pri spremanju.");
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className={cn("space-y-4", disabled && "opacity-60")}
    >
      <input type="hidden" name="country" value={country} />

      {disabled && disabledNote && (
        <p className="flex items-start gap-2 border border-border-strong bg-surface-2 px-3 py-2 text-sm text-muted">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-2" />
          {disabledNote}
        </p>
      )}

      <fieldset disabled={disabled} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_2fr_auto]">
          <div>
            <Label
              htmlFor="s-label"
              className="text-[12px] font-bold uppercase tracking-[1.5px] text-muted mb-2"
            >
              Naziv
            </Label>
            <Input
              id="s-label"
              name="label"
              required
              placeholder="Autohaus Kucur GmbH"
              className="bg-background border-border-strong"
            />
          </div>
          <div>
            <Label
              htmlFor="s-url"
              className="text-[12px] font-bold uppercase tracking-[1.5px] text-muted mb-2"
            >
              {urlLabel}
            </Label>
            <Input
              id="s-url"
              name="url"
              type="url"
              required
              placeholder={urlPlaceholder}
              className="bg-background border-border-strong"
            />
          </div>
          <div>
            <Label
              htmlFor="s-interval"
              className="text-[12px] font-bold uppercase tracking-[1.5px] text-muted mb-2"
            >
              Interval (dana)
            </Label>
            <Input
              id="s-interval"
              name="intervalDays"
              type="number"
              min={1}
              max={365}
              defaultValue={14}
              className="w-32 bg-background border-border-strong"
            />
          </div>
        </div>

        <p className="text-xs text-muted">
          Zalijepite poveznicu na stranicu ponude trgovca (npr.{" "}
          <code className="text-muted-2">
            https://home.mobile.de/NAZIVTVRTKE
          </code>
          ). Sva vozila s te stranice povlače se automatski, uključujući
          fotografije.
        </p>

        {error && (
          <p className="border border-error/40 bg-surface-2 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}
        {success && (
          <p className="border border-success/40 bg-surface-2 px-3 py-2 text-sm text-success">
            Izvor je dodan i bit će obrađen u sljedećem satu.
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          disabled={pending || disabled}
          className="font-display uppercase tracking-[2px]"
        >
          <Plus className="size-4" />
          {pending ? "Spremanje..." : "Dodaj izvor"}
        </Button>
      </fieldset>
    </form>
  );
}
