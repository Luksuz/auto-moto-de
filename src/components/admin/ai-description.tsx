"use client";

import { useState } from "react";
import Image from "next/image";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ManagedImage } from "@/components/admin/image-manager";

export type AiContext = {
  brand?: string;
  model?: string;
  title?: string;
  firstRegistration?: string;
  fuelType?: string;
  transmission?: string;
  powerKs?: number | string;
  powerKw?: number | string;
  mileageKm?: number | string;
  bodyType?: string;
  priceEur?: number | string;
  equipment?: string[];
};

export function AiDescription({
  images,
  context,
  onResult,
}: {
  images: ManagedImage[];
  context: AiContext;
  onResult: (text: string) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrls: images
            .filter((i) => selected.has(i.url))
            .map((i) => i.url),
          context,
        }),
      });

      if (!res.ok || !res.body) {
        const msg = await res.text();
        setError(msg || "Generiranje nije uspjelo.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      onResult("");
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        onResult(acc);
      }
    } catch {
      setError("Generiranje nije uspjelo. Pokušajte ponovno.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2/40 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="size-4 text-primary" />
        AI generiranje opisa
      </div>
      <p className="text-xs text-muted">
        Odaberite fotografije koje će AI uzeti u obzir (uz unesene podatke o
        vozilu), pa generirajte opis.
      </p>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
          {images.map((img) => {
            const isSel = selected.has(img.url);
            return (
              <button
                key={img.id ?? img.key}
                type="button"
                onClick={() => toggle(img.url)}
                className={cn(
                  "relative aspect-[4/3] overflow-hidden rounded-md border-2",
                  isSel ? "border-primary" : "border-transparent opacity-70",
                )}
              >
                <Image
                  src={img.url}
                  alt=""
                  fill
                  sizes="120px"
                  className="object-cover"
                />
                {isSel && (
                  <span className="absolute inset-0 bg-primary/20" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <Button
        type="button"
        variant="navy"
        size="sm"
        onClick={generate}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        {loading ? "Generiram..." : "Generiraj opis pomoću AI-a"}
      </Button>
    </div>
  );
}
