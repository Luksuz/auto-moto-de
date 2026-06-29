"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteCar, togglePublish } from "@/lib/actions/cars";

export function CarRowActions({
  id,
  published,
}: {
  id: string;
  published: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function onToggle() {
    startTransition(async () => {
      await togglePublish(id, !published);
      router.refresh();
    });
  }

  function onDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 4000);
      return;
    }
    startTransition(async () => {
      await deleteCar(id);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        disabled={pending}
        title={published ? "Sakrij" : "Objavi"}
      >
        {published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        {published ? "Sakrij" : "Objavi"}
      </Button>
      <Button asChild variant="ghost" size="sm">
        <Link href={`/admin/vozila/${id}`}>
          <Pencil className="size-4" />
          Uredi
        </Link>
      </Button>
      <Button
        variant={confirming ? "danger" : "ghost"}
        size="sm"
        onClick={onDelete}
        disabled={pending}
      >
        <Trash2 className="size-4" />
        {confirming ? "Potvrdi" : "Obriši"}
      </Button>
    </div>
  );
}
