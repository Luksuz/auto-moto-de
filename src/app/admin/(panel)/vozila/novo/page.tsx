import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { CarForm } from "@/components/admin/car-form";

export default async function NovoVoziloPage() {
  await requireUser();
  const agents = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/vozila"
          className="text-muted hover:text-primary"
          aria-label="Natrag"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <div className="mb-2 font-display text-[12px] uppercase tracking-[4px] text-primary">
            Administracija
          </div>
          <h1 className="font-display text-2xl font-semibold uppercase">
            Novo vozilo
          </h1>
        </div>
      </div>
      <CarForm agents={agents} />
    </div>
  );
}
