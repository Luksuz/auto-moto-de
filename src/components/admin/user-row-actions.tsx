"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { updateUserRole, toggleUserActive } from "@/lib/actions/users";
import { ROLE_LABEL, toOptions } from "@/lib/constants";
import type { Role } from "@prisma/client";

export function UserRowActions({
  id,
  role,
  active,
  isSelf,
}: {
  id: string;
  role: Role;
  active: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-2">
      <Select
        value={role}
        disabled={pending || isSelf}
        className="h-9 w-36"
        onChange={(e) => {
          const next = e.target.value as Role;
          startTransition(async () => {
            await updateUserRole(id, next);
            router.refresh();
          });
        }}
      >
        {toOptions(ROLE_LABEL).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Button
        variant={active ? "outline" : "primary"}
        size="sm"
        disabled={pending || isSelf}
        onClick={() =>
          startTransition(async () => {
            await toggleUserActive(id, !active);
            router.refresh();
          })
        }
      >
        {active ? "Deaktiviraj" : "Aktiviraj"}
      </Button>
    </div>
  );
}
