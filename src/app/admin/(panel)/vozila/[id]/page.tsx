import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { CarForm, type CarFormValues } from "@/components/admin/car-form";
import type { ManagedImage } from "@/components/admin/image-manager";

const s = (v: string | number | null | undefined) =>
  v === null || v === undefined ? "" : String(v);

export default async function UrediVoziloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const [car, agents] = await Promise.all([
    prisma.car.findUnique({
      where: { id },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!car) notFound();

  const initialValues: Partial<CarFormValues> = {
    title: car.title,
    brand: car.brand,
    model: car.model,
    slug: car.slug,
    priceEur: s(car.priceEur),
    priceRating: s(car.priceRating),
    published: car.published,
    featured: car.featured,
    assignedAgentId: s(car.assignedAgentId),
    bodyType: car.bodyType,
    firstRegistration: car.firstRegistration,
    mileageKm: s(car.mileageKm),
    fuelType: car.fuelType,
    powerKw: s(car.powerKw),
    powerKs: s(car.powerKs),
    transmission: car.transmission,
    engineCcm: s(car.engineCcm),
    doors: s(car.doors),
    seats: s(car.seats),
    airConditioning: s(car.airConditioning),
    parkingSensors: s(car.parkingSensors),
    tuv: s(car.tuv),
    emissionClass: s(car.emissionClass),
    origin: s(car.origin),
    previousOwners: s(car.previousOwners),
    description: s(car.description),
    warranty: s(car.warranty),
    originDetails: s(car.originDetails),
  };

  const initialImages: ManagedImage[] = car.images.map((img) => ({
    id: img.id,
    url: img.url,
    key: img.key,
    alt: img.alt,
    sortOrder: img.sortOrder,
    isPrimary: img.isPrimary,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/vozila"
          className="text-muted hover:text-foreground"
          aria-label="Natrag"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="truncate text-2xl font-bold tracking-tight">
          {car.title}
        </h1>
      </div>
      <CarForm
        carId={car.id}
        agents={agents}
        initialValues={initialValues}
        initialEquipment={car.equipment}
        initialImages={initialImages}
      />
    </div>
  );
}
