"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSource } from "@/lib/actions/sources";

export function SourceCreateForm() {
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
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
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
            Poveznica na mobile.de
          </Label>
          <Input
            id="s-url"
            name="url"
            type="url"
            required
            placeholder="https://home.mobile.de/AUTOHAUSKUCURGMBH"
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
        <code className="text-muted-2">https://home.mobile.de/NAZIVTVRTKE</code>). Sva
        vozila s te stranice povlače se automatski, uključujući fotografije.
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
        disabled={pending}
        className="font-display uppercase tracking-[2px]"
      >
        <Plus className="size-4" />
        {pending ? "Spremanje..." : "Dodaj izvor"}
      </Button>
    </form>
  );
}
