import Link from "next/link";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { primaryImage, type CarWithImages } from "@/lib/cars";
import { formatPrice, formatKm } from "@/lib/utils";
import {
  FUEL_LABEL_I18N,
  TRANSMISSION_LABEL_I18N,
} from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/config";

interface CarCardProps {
  car: CarWithImages;
  locale?: Locale;
  detailsLabel?: string;
}

export function CarCard({
  car,
  locale = "hr",
  detailsLabel = "Detalji",
}: CarCardProps) {
  const img = primaryImage(car);
  const year = car.firstRegistration.split("/")[1];
  const fuel = FUEL_LABEL_I18N[locale][car.fuelType];
  const gear = TRANSMISSION_LABEL_I18N[locale][car.transmission];

  return (
    <Link
      href={`/vozila/${car.slug}`}
      className="group block border border-border bg-surface transition-colors hover:border-primary"
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-surface-2">
        {img ? (
          <Image
            src={img}
            alt={car.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <ImageOff className="size-10" />
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="truncate font-display text-[19px] font-semibold uppercase text-foreground">
          {car.title}
        </h3>

        <div className="mb-3.5 mt-2 text-[13.5px] text-muted-2">
          {year} · {formatKm(car.mileageKm)} · {fuel} · {gear}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3.5">
          <span className="font-display text-[22px] text-primary">
            {formatPrice(car.priceEur)}
          </span>
          <span className="text-[13px] font-bold uppercase tracking-[1.5px] text-foreground">
            {detailsLabel} →
          </span>
        </div>
      </div>
    </Link>
  );
}
