import Link from "next/link";
import Image from "next/image";
import { Gauge, Calendar, Fuel, Cog, ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { primaryImage, type CarWithImages } from "@/lib/cars";
import {
  formatPrice,
  formatKm,
} from "@/lib/utils";
import {
  BODY_TYPE_LABEL,
  FUEL_TYPE_LABEL,
  TRANSMISSION_LABEL,
  PRICE_RATING_LABEL,
} from "@/lib/constants";

export function CarCard({ car }: { car: CarWithImages }) {
  const img = primaryImage(car);

  return (
    <Link
      href={`/vozila/${car.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {img ? (
          <Image
            src={img}
            alt={car.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <ImageOff className="size-10" />
          </div>
        )}
        {car.priceRating && (
          <div className="absolute left-3 top-3">
            <Badge variant="rating" className="bg-rating text-white shadow-sm">
              {PRICE_RATING_LABEL[car.priceRating]}
            </Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-semibold leading-snug group-hover:text-primary">
          {car.title}
        </h3>

        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-muted">
          <Spec icon={<Calendar className="size-3.5" />} value={car.firstRegistration} />
          <Spec icon={<Gauge className="size-3.5" />} value={formatKm(car.mileageKm)} />
          <Spec icon={<Fuel className="size-3.5" />} value={FUEL_TYPE_LABEL[car.fuelType]} />
          <Spec icon={<Cog className="size-3.5" />} value={TRANSMISSION_LABEL[car.transmission]} />
        </div>

        <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
          <div>
            <span className="text-[11px] uppercase tracking-wide text-muted">
              {BODY_TYPE_LABEL[car.bodyType]}
            </span>
            <p className="text-lg font-extrabold text-navy">
              {formatPrice(car.priceEur)}
            </p>
          </div>
          <span className="rounded-lg bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-white">
            Detalji
          </span>
        </div>
      </div>
    </Link>
  );
}

function Spec({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-primary">{icon}</span>
      <span className="truncate text-foreground/80">{value}</span>
    </span>
  );
}
