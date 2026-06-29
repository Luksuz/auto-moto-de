"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createUser } from "@/lib/actions/users";
import { ROLE_LABEL, toOptions } from "@/lib/constants";

export function UserCreateForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createUser(fd);
      if (res.ok) {
        setSuccess(true);
        formRef.current?.reset();
        router.refresh();
      } else {
        setError(res.error ?? "Greška pri spremanju.");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="u-name">Ime</Label>
          <Input id="u-name" name="name" required placeholder="Ivan Ivić" />
        </div>
        <div>
          <Label htmlFor="u-email">E-mail</Label>
          <Input
            id="u-email"
            name="email"
            type="email"
            required
            placeholder="ivan@kupiauto.de"
          />
        </div>
        <div>
          <Label htmlFor="u-password">Lozinka</Label>
          <Input
            id="u-password"
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Najmanje 6 znakova"
          />
        </div>
        <div>
          <Label htmlFor="u-phone">Telefon</Label>
          <Input id="u-phone" name="phone" placeholder="+385 ..." />
        </div>
        <div>
          <Label htmlFor="u-role">Uloga</Label>
          <Select id="u-role" name="role" defaultValue="AGENT">
            {toOptions(ROLE_LABEL).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Korisnik je dodan.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        <UserPlus className="size-4" />
        {pending ? "Spremanje..." : "Dodaj korisnika"}
      </Button>
    </form>
  );
}
