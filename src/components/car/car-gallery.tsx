"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryImage {
  url: string;
  alt?: string | null;
}

export function CarGallery({
  images,
  title,
}: {
  images: GalleryImage[];
  title: string;
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
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-border bg-surface-2 text-muted">
        <div className="flex flex-col items-center gap-2">
          <ImageOff className="size-12" />
          <span className="text-sm">Nema dostupnih fotografija</span>
        </div>
      </div>
    );
  }

  const current = images[active];

  return (
    <div className="flex flex-col gap-3">
      <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-surface-2">
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
              className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-navy/60 text-white backdrop-blur transition-colors hover:bg-navy/80"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Sljedeća fotografija"
              className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-navy/60 text-white backdrop-blur transition-colors hover:bg-navy/80"
            >
              <ChevronRight className="size-5" />
            </button>
            <div className="absolute bottom-3 right-3 rounded-full bg-navy/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
              {active + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div
          ref={stripRef}
          className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1"
        >
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              data-thumb={i}
              onClick={() => setActive(i)}
              aria-label={`Fotografija ${i + 1}`}
              className={cn(
                "relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                i === active
                  ? "border-primary"
                  : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image
                src={img.url}
                alt={img.alt || `${title} — fotografija ${i + 1}`}
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
