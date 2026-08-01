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
}: {
  id: string;
  label: string;
  enabled: boolean;
  intervalDays: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [interval, setInterval] = useState(String(intervalDays));
  const [confirming, setConfirming] = useState(false);

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
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
        title="Označi za obradu u sljedećem satu"
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
        <span className="flex items-center gap-1">
          <Button
            variant="primary"
            size="sm"
            disabled={pending}
            onClick={() => run(() => deleteSource(id))}
          >
            Potvrdi
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
          title="Ukloni izvor (vozila ostaju)"
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  );
}
