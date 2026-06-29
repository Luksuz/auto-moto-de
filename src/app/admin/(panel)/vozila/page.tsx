import Link from "next/link";
import Image from "next/image";
import { Plus, Search } from "lucide-react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { primaryImage } from "@/lib/cars";
import { formatPrice, formatKm } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CarRowActions } from "@/components/admin/car-row-actions";

export default async function VozilaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim();

  const where: Prisma.CarWhereInput = query
    ? {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { brand: { contains: query, mode: "insensitive" } },
          { model: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  const cars = await prisma.car.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { images: true, assignedAgent: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vozila</h1>
          <p className="text-sm text-muted">{cars.length} vozila</p>
        </div>
        <Button asChild variant="accent">
          <Link href="/admin/vozila/novo">
            <Plus className="size-4" />
            Novo vozilo
          </Link>
        </Button>
      </div>

      <form className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          name="q"
          defaultValue={query}
          placeholder="Pretraži po naslovu, marki, modelu..."
          className="pl-9"
        />
      </form>

      <Card className="overflow-hidden">
        {cars.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            Nema vozila. Dodajte prvo vozilo.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Vozilo</th>
                  <th className="px-4 py-3 font-semibold">Cijena</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Agent</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cars.map((car) => {
                  const img = primaryImage(car);
                  return (
                    <tr key={car.id} className="hover:bg-surface-2/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-surface-2">
                            {img && (
                              <Image
                                src={img}
                                alt={car.title}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium">{car.title}</div>
                            <div className="text-xs text-muted">
                              {car.brand} {car.model} • {formatKm(car.mileageKm)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">
                        {formatPrice(car.priceEur)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {car.published ? (
                            <Badge variant="success">Objavljeno</Badge>
                          ) : (
                            <Badge variant="neutral">Skica</Badge>
                          )}
                          {car.featured && (
                            <Badge variant="accent">Izdvojeno</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted">
                        {car.assignedAgent?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <CarRowActions
                          id={car.id}
                          published={car.published}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
