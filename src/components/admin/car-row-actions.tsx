"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteCar } from "@/lib/actions/cars";

/** Delete with tap-twice confirmation; used in the list and on the edit page. */
export function DeleteCarButton({
  id,
  redirectTo,
}: {
  id: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function onDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 4000);
      return;
    }
    startTransition(async () => {
      await deleteCar(id);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  return (
    <Button
      variant={confirming ? "danger" : "ghost"}
      size="sm"
      className={confirming ? undefined : "text-error hover:bg-error/10"}
      onClick={onDelete}
      disabled={pending}
    >
      <Trash2 className="size-4" />
      {confirming ? "Potvrdi brisanje" : "Obriši"}
    </Button>
  );
}

export function CarRowActions({ id }: { id: string }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/admin/vozila/${id}`}>
          <Pencil className="size-4" />
          Uredi
        </Link>
      </Button>
      <DeleteCarButton id={id} />
    </div>
  );
}
