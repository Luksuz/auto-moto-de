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
          className="text-muted hover:text-foreground"
          aria-label="Natrag"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Novo vozilo</h1>
      </div>
      <CarForm agents={agents} />
    </div>
  );
}
