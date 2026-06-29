"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { updateLeadStatus } from "@/lib/actions/lead-admin";
import { LEAD_STATUS_LABEL } from "@/lib/constants";
import type { LeadStatus } from "@prisma/client";

const ORDER: LeadStatus[] = ["NEW", "CONTACTED", "CLOSED"];

export function LeadStatusSelect({
  id,
  status,
}: {
  id: string;
  status: LeadStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      className="h-9 w-40"
      onChange={(e) => {
        const next = e.target.value as LeadStatus;
        startTransition(async () => {
          await updateLeadStatus(id, next);
          router.refresh();
        });
      }}
    >
      {ORDER.map((s) => (
        <option key={s} value={s}>
          {LEAD_STATUS_LABEL[s]}
        </option>
      ))}
    </Select>
  );
}
