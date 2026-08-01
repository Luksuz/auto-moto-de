import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SourceCreateForm } from "@/components/admin/source-create-form";
import { SourceRowActions } from "@/components/admin/source-row-actions";
import type { ScrapeStatus } from "@prisma/client";

// Run counters and "next run" move without any request to this app (the worker
// runs on Railway), so a cached page would show stale state indefinitely.
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<ScrapeStatus, string> = {
  RUNNING: "U tijeku",
  SUCCESS: "Uspješno",
  PARTIAL: "Djelomično",
  FAILED: "Greška",
};

const STATUS_VARIANT: Record<ScrapeStatus, "primary" | "success" | "warning" | "accent"> = {
  RUNNING: "primary",
  SUCCESS: "success",
  PARTIAL: "warning",
  FAILED: "accent",
};

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** The worker ticks hourly, so a due date in the past means "in the next hour"
 *  rather than "overdue" — say that instead of showing a stale timestamp. */
function fmtNextRun(d: Date, enabled: boolean) {
  if (!enabled) return "pauzirano";
  return d.getTime() <= Date.now() ? "u sljedećem satu" : fmtDate(d);
}

export default async function IzvoriPage() {
  await requireAdmin();

  const [sources, runs] = await Promise.all([
    prisma.dealerSource.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.scrapeRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      include: { source: { select: { label: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 font-display text-[12px] uppercase tracking-[4px] text-primary">
          Administracija
        </div>
        <h1 className="font-display text-2xl font-semibold uppercase">Izvori vozila</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Trgovci s mobile.de čija se ponuda automatski povlači i osvježava. Svaki se
          izvor obrađuje prema svom intervalu (zadano svakih 14 dana): nova se vozila
          dodaju, postojećima se osvježavaju cijena i kilometraža, a prodana vozila
          brišu se zajedno s fotografijama.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base uppercase tracking-[2px]">
            Novi izvor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SourceCreateForm />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left text-[11px] uppercase tracking-[1.5px] text-muted-2">
                <th className="px-4 py-3 font-semibold">Trgovac</th>
                <th className="px-4 py-3 font-semibold">Vozila</th>
                <th className="px-4 py-3 font-semibold">Zadnja obrada</th>
                <th className="px-4 py-3 font-semibold">Sljedeća</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sources.map((s) => (
                <tr key={s.id} className="hover:bg-surface-2/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.label}</div>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted underline-offset-2 hover:underline"
                    >
                      {s.url.replace(/^https?:\/\//, "")}
                    </a>
                    {s.lastMessage && (
                      <div className="mt-1 max-w-md whitespace-pre-line text-xs text-accent-600">
                        {s.lastMessage.split("\n").slice(0, 3).join("\n")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{s.carCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {s.lastStatus && (
                        <Badge variant={STATUS_VARIANT[s.lastStatus]}>
                          {STATUS_LABEL[s.lastStatus]}
                        </Badge>
                      )}
                      <span className="text-xs text-muted">{fmtDate(s.lastRunAt)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {fmtNextRun(s.nextRunAt, s.enabled)}
                  </td>
                  <td className="px-4 py-3">
                    <SourceRowActions
                      id={s.id}
                      label={s.label}
                      enabled={s.enabled}
                      intervalDays={s.intervalDays}
                    />
                  </td>
                </tr>
              ))}
              {sources.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                    Još nema dodanih izvora.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="font-display text-base uppercase tracking-[2px]">
            Povijest obrada
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left text-[11px] uppercase tracking-[1.5px] text-muted-2">
                <th className="px-4 py-3 font-semibold">Trgovac</th>
                <th className="px-4 py-3 font-semibold">Početak</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Promjene</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs.map((r) => (
                <tr key={r.id} className="align-top hover:bg-surface-2/50">
                  <td className="px-4 py-3">{r.source.label}</td>
                  <td className="px-4 py-3 text-xs text-muted">{fmtDate(r.startedAt)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    {r.message && (
                      <div className="mt-1 max-w-md whitespace-pre-line text-xs text-muted">
                        {r.message.split("\n").slice(0, 3).join("\n")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums text-muted">
                    {r.listingsFound} oglasa · +{r.carsCreated} novo · ~{r.carsUpdated} osvježeno
                    {r.carsDeleted > 0 && ` · −${r.carsDeleted} obrisano`}
                    {r.imagesAdded > 0 && ` · ${r.imagesAdded} fotografija`}
                  </td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted">
                    Još nema obrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
