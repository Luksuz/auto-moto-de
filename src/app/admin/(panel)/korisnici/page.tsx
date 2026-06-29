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
      <h1 className="text-2xl font-bold tracking-tight">Korisnici</h1>

      <Card>
        <CardHeader>
          <CardTitle>Novi korisnik</CardTitle>
        </CardHeader>
        <CardContent>
          <UserCreateForm />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
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
