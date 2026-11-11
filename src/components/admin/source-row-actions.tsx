"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteSource,
  runSourceNow,
  toggleSourceEnabled,
  updateSourceInterval,
} from "@/lib/actions/sources";

export function SourceRowActions({
  id,
  label,
  enabled,
  intervalDays,
  carCount,
}: {
  id: string;
  label: string;
  enabled: boolean;
  intervalDays: number;
  carCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [interval, setInterval] = useState(String(intervalDays));
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok?: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (res && res.ok === false) setError(res.error ?? "Greška.");
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min={1}
          max={365}
          value={interval}
          disabled={pending}
          onChange={(e) => setInterval(e.target.value)}
          onBlur={() => {
            const n = Number(interval);
            if (n !== intervalDays && Number.isInteger(n)) {
              run(() => updateSourceInterval(id, n));
            }
          }}
          className="h-9 w-20 bg-background border-border-strong"
          aria-label={`Interval u danima za ${label}`}
        />
        <span className="text-xs text-muted">dana</span>
      </div>

      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => run(() => runSourceNow(id))}
        title="Skeniraj ovu auto kuću sada"
      >
        <Play className="size-4" />
        Pokreni
      </Button>

      <Button
        variant={enabled ? "outline" : "primary"}
        size="sm"
        disabled={pending}
        onClick={() => run(() => toggleSourceEnabled(id, !enabled))}
      >
        {enabled ? "Pauziraj" : "Aktiviraj"}
      </Button>

      {confirming ? (
        <span className="flex flex-wrap items-center justify-end gap-1">
          <span className="text-xs text-error">
            Obrisati {label} i {carCount} {carCount === 1 ? "vozilo" : "vozila"} s fotografijama?
          </span>
          <Button
            variant="primary"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const res = await deleteSource(id);
                if (!res.ok) setConfirming(false);
                return res;
              })
            }
          >
            {pending ? "Brisanje..." : "Potvrdi"}
          </Button>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
            Odustani
          </Button>
        </span>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => setConfirming(true)}
          title="Ukloni auto kuću i sva njezina vozila s fotografijama"
          aria-label={`Ukloni ${label}`}
        >
          <Trash2 className="size-4" />
        </Button>
      )}

      {error && <p className="basis-full text-right text-xs text-error">{error}</p>}
    </div>
  );
}
