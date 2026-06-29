import Link from "next/link";
import Image from "next/image";
import { Car, CheckCircle2, Star, Inbox } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { primaryImage } from "@/lib/cars";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LEAD_TYPE_LABEL,
  LEAD_STATUS_LABEL,
} from "@/lib/constants";
import type { LeadStatus } from "@prisma/client";

const STATUS_VARIANT: Record<LeadStatus, "warning" | "primary" | "success"> = {
  NEW: "warning",
  CONTACTED: "primary",
  CLOSED: "success",
};

export default async function DashboardPage() {
  const [
    totalCars,
    publishedCars,
    featuredCars,
    newLeads,
    latestLeads,
    latestCars,
  ] = await Promise.all([
    prisma.car.count(),
    prisma.car.count({ where: { published: true } }),
    prisma.car.count({ where: { featured: true } }),
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { car: { select: { title: true, slug: true } } },
    }),
    prisma.car.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { images: true },
    }),
  ]);

  const stats = [
    { label: "Ukupno vozila", value: totalCars, icon: Car },
    { label: "Objavljena", value: publishedCars, icon: CheckCircle2 },
    { label: "Izdvojena", value: featuredCars, icon: Star },
    { label: "Novi upiti", value: newLeads, icon: Inbox },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Pregled</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-4">
                <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs text-muted">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Najnoviji upiti</CardTitle>
            <Link
              href="/admin/leads"
              className="text-sm font-medium text-primary hover:underline"
            >
              Svi upiti
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {latestLeads.length === 0 ? (
              <p className="p-5 text-sm text-muted">Nema upita.</p>
            ) : (
              <ul className="divide-y divide-border">
                {latestLeads.map((lead) => (
                  <li
                    key={lead.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {lead.name}
                      </div>
                      <div className="truncate text-xs text-muted">
                        {LEAD_TYPE_LABEL[lead.type]}
                        {lead.car ? ` • ${lead.car.title}` : ""}
                      </div>
                    </div>
                    <Badge variant={STATUS_VARIANT[lead.status]}>
                      {LEAD_STATUS_LABEL[lead.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Najnovija vozila</CardTitle>
            <Link
              href="/admin/vozila"
              className="text-sm font-medium text-primary hover:underline"
            >
              Sva vozila
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {latestCars.length === 0 ? (
              <p className="p-5 text-sm text-muted">Nema vozila.</p>
            ) : (
              <ul className="divide-y divide-border">
                {latestCars.map((car) => {
                  const img = primaryImage(car);
                  return (
                    <li key={car.id}>
                      <Link
                        href={`/admin/vozila/${car.id}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2"
                      >
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
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {car.title}
                          </div>
                          <div className="text-xs text-muted">
                            {formatPrice(car.priceEur)}
                          </div>
                        </div>
                        {!car.published && (
                          <Badge variant="neutral">Skica</Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
