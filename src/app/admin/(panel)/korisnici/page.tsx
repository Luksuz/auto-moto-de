import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCreateForm } from "@/components/admin/user-create-form";
import { UserRowActions } from "@/components/admin/user-row-actions";

export default async function KorisniciPage() {
  const me = await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 font-display text-[12px] uppercase tracking-[4px] text-primary">
          Administracija
        </div>
        <h1 className="font-display text-2xl font-semibold uppercase">
          Korisnici
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base uppercase tracking-[2px]">
            Novi korisnik
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UserCreateForm />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left text-[11px] uppercase tracking-[1.5px] text-muted-2">
                <th className="px-4 py-3 font-semibold">Korisnik</th>
                <th className="px-4 py-3 font-semibold">Telefon</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => {
                const isSelf = u.id === me.id;
                return (
                  <tr key={u.id} className="hover:bg-surface-2/50">
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {u.name}
                        {isSelf && (
                          <span className="ml-2 text-xs text-muted">(vi)</span>
                        )}
                      </div>
                      <div className="text-xs text-muted">{u.email}</div>
                    </td>
                    <td className="px-4 py-3 text-muted">{u.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      {u.active ? (
                        <Badge variant="success">Aktivan</Badge>
                      ) : (
                        <Badge variant="neutral">Neaktivan</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <UserRowActions
                        id={u.id}
                        role={u.role}
                        active={u.active}
                        isSelf={isSelf}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
