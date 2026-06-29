"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, Star, Trash2, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ManagedImage = {
  id?: string;
  url: string;
  key: string;
  alt?: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

type UploadResponse = {
  files?: { url: string; key: string; name: string }[];
  error?: string;
};

export function ImageManager({
  images,
  onChange,
}: {
  images: ManagedImage[];
  onChange: (images: ManagedImage[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function reindex(list: ManagedImage[]): ManagedImage[] {
    const hasPrimary = list.some((i) => i.isPrimary);
    return list.map((img, idx) => ({
      ...img,
      sortOrder: idx,
      isPrimary: hasPrimary ? img.isPrimary : idx === 0,
    }));
  }

  async function uploadFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      for (const f of arr) fd.append("files", f);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      const data: UploadResponse = await res.json();
      if (!res.ok || !data.files) {
        setError(data.error ?? "Greška pri prijenosu slika.");
        return;
      }
      const start = images.length;
      const added: ManagedImage[] = data.files.map((f, i) => ({
        url: f.url,
        key: f.key,
        alt: null,
        sortOrder: start + i,
        isPrimary: false,
      }));
      onChange(reindex([...images, ...added]));
    } catch {
      setError("Greška pri prijenosu slika.");
    } finally {
      setUploading(false);
    }
  }

  function setPrimary(idx: number) {
    onChange(images.map((img, i) => ({ ...img, isPrimary: i === idx })));
  }

  function remove(idx: number) {
    onChange(reindex(images.filter((_, i) => i !== idx)));
  }

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= images.length) return;
    const list = [...images];
    [list[idx], list[target]] = [list[target], list[idx]];
    onChange(reindex(list));
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface-2/50 px-6 py-8 text-center transition-colors hover:border-primary/50",
          dragOver && "border-primary bg-primary/5",
        )}
      >
        {uploading ? (
          <Loader2 className="size-6 animate-spin text-primary" />
        ) : (
          <Upload className="size-6 text-muted" />
        )}
        <div className="text-sm font-medium">
          {uploading ? "Prijenos u tijeku..." : "Povucite slike ili kliknite za odabir"}
        </div>
        <div className="text-xs text-muted">JPG, PNG, WEBP, AVIF — do 15 MB</div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, idx) => (
            <div
              key={img.id ?? img.key}
              className={cn(
                "group relative overflow-hidden rounded-lg border bg-surface",
                img.isPrimary ? "border-primary ring-2 ring-primary/30" : "border-border",
              )}
            >
              <div className="relative aspect-[4/3] bg-surface-2">
                <Image
                  src={img.url}
                  alt={img.alt ?? ""}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
                {img.isPrimary && (
                  <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    <Star className="size-3" />
                    Glavna
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 p-1.5">
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="rounded p-1 text-muted hover:bg-surface-2 disabled:opacity-30"
                    title="Pomakni gore"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === images.length - 1}
                    className="rounded p-1 text-muted hover:bg-surface-2 disabled:opacity-30"
                    title="Pomakni dolje"
                  >
                    <ArrowDown className="size-4" />
                  </button>
                </div>
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => setPrimary(idx)}
                    disabled={img.isPrimary}
                    className="rounded p-1 text-muted hover:bg-surface-2 disabled:opacity-30"
                    title="Postavi kao glavnu"
                  >
                    <Star className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="rounded p-1 text-red-600 hover:bg-red-50"
                    title="Obriši"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
