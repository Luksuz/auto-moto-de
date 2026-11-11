"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { startScan } from "@/lib/actions/sources";

/** Dashboard control: queue a scan of every active dealer, or of one. The scan
 *  itself runs on the Railway scheduler, which picks queued dealers up within
 *  a minute — this only marks them due. */
export function ScanControl({
  sources,
}: {
  sources: { id: string; label: string; enabled: boolean }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function onStart() {
    setMessage(null);
    startTransition(async () => {
      const res = await startScan(target || null);
      if (!res.ok) {
        setMessage({ ok: false, text: res.error ?? "Greška." });
      } else {
        const label = sources.find((s) => s.id === target)?.label;
        setMessage({
          ok: true,
          text: label
            ? `Skeniranje auto kuće ${label} kreće za koju minutu.`
            : `Skeniranje ${res.queued} auto kuća kreće za koju minutu. Obrađuju se jedna za drugom.`,
        });
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-80">
          <Select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={pending}
            aria-label="Koju auto kuću skenirati"
            className="bg-background border-border-strong"
          >
            <option value="">Sve auto kuće</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
                {s.enabled ? "" : " (pauzirano)"}
              </option>
            ))}
          </Select>
        </div>
        <Button
          variant="primary"
          disabled={pending}
          onClick={onStart}
          className="font-display uppercase tracking-[2px]"
        >
          <Play className="size-4" />
          {pending ? "Pokretanje..." : "Pokreni skeniranje"}
        </Button>
      </div>
      {message && (
        <p
          className={
            message.ok
              ? "border border-success/40 bg-surface-2 px-3 py-2 text-sm text-success"
              : "border border-error/40 bg-surface-2 px-3 py-2 text-sm text-error"
          }
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
