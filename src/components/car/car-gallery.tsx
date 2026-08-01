"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryImage {
  url: string;
  /** 400px variant for the thumbnail strip. Vercel's image optimizer is off
   *  (see next.config.ts), so the browser downloads exactly what is listed here
   *  — a 42-photo strip pointing at `url` would pull ~12 MB. Null for
   *  hand-uploaded images, which fall back to `url`. */
  thumbUrl?: string | null;
  alt?: string | null;
}

export function CarGallery({
  images,
  title,
  emptyLabel = "Nema dostupnih fotografija",
}: {
  images: GalleryImage[];
  title: string;
  emptyLabel?: string;
}) {
  const [active, setActive] = React.useState(0);
  const stripRef = React.useRef<HTMLDivElement>(null);

  const hasImages = images.length > 0;

  const go = React.useCallback(
    (dir: 1 | -1) => {
      setActive((i) => {
        const next = (i + dir + images.length) % images.length;
        return next;
      });
    },
    [images.length],
  );

  React.useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(
      `[data-thumb="${active}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [active]);

  if (!hasImages) {
    return (
      <div className="flex aspect-[16/10] w-full items-center justify-center border border-border bg-surface-2 text-muted">
        <div className="flex flex-col items-center gap-2">
          <ImageOff className="size-12" />
          <span className="text-sm">{emptyLabel}</span>
        </div>
      </div>
    );
  }

  const current = images[active];

  return (
    <div>
      <div className="group relative aspect-[16/10] w-full overflow-hidden border border-border bg-surface-2">
        <Image
          key={current.url}
          src={current.url}
          alt={current.alt || title}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover"
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Prethodna fotografija"
              className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center border border-border-strong bg-background/70 text-foreground backdrop-blur transition-colors hover:border-primary hover:text-primary"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Sljedeća fotografija"
              className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center border border-border-strong bg-background/70 text-foreground backdrop-blur transition-colors hover:border-primary hover:text-primary"
            >
              <ChevronRight className="size-5" />
            </button>
            <div className="absolute bottom-3 right-3 border border-border-strong bg-background/70 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur">
              {active + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div ref={stripRef} className="mt-3 grid grid-cols-4 gap-3">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              data-thumb={i}
              onClick={() => setActive(i)}
              aria-label={`Fotografija ${i + 1}`}
              className={cn(
                "relative h-24 w-full overflow-hidden border transition-colors",
                i === active
                  ? "border-primary"
                  : "border-border opacity-80 hover:opacity-100 hover:border-primary",
              )}
            >
              <Image
                src={img.thumbUrl ?? img.url}
                alt={img.alt || `${title} — fotografija ${i + 1}`}
                fill
                loading="lazy"
                sizes="(max-width: 1024px) 25vw, 180px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
