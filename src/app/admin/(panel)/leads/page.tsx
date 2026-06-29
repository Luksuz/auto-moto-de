import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeadStatusSelect } from "@/components/admin/lead-status-select";
import { LEAD_TYPE_LABEL } from "@/lib/constants";
import type { LeadType } from "@prisma/client";

const TYPE_VARIANT: Record<LeadType, "primary" | "accent" | "navy"> = {
  CONTACT: "primary",
  FINANCING: "accent",
  VIEWING: "navy",
};

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function LeadsPage() {
  await requireUser();
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: { car: { select: { title: true, slug: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upiti</h1>
        <p className="text-sm text-muted">{leads.length} upita</p>
      </div>

      <Card className="overflow-hidden">
        {leads.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">Nema upita.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Kontakt</th>
                  <th className="px-4 py-3 font-semibold">Tip</th>
                  <th className="px-4 py-3 font-semibold">Vozilo</th>
                  <th className="px-4 py-3 font-semibold">Datum</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.map((lead) => (
                  <tr key={lead.id} className="align-top hover:bg-surface-2/50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-xs text-muted">
                        <a
                          href={`tel:${lead.phone}`}
                          className="hover:underline"
                        >
                          {lead.phone}
                        </a>
                        {lead.email && (
                          <>
                            {" • "}
                            <a
                              href={`mailto:${lead.email}`}
                              className="hover:underline"
                            >
                              {lead.email}
                            </a>
                          </>
                        )}
                      </div>
                      {lead.message && (
                        <p className="mt-1 max-w-md text-xs text-muted">
                          {lead.message}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={TYPE_VARIANT[lead.type]}>
                        {LEAD_TYPE_LABEL[lead.type]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {lead.car ? (
                        <Link
                          href={`/vozila/${lead.car.slug}`}
                          className="text-primary hover:underline"
                        >
                          {lead.car.title}
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">
                      {fmtDate(lead.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <LeadStatusSelect id={lead.id} status={lead.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
