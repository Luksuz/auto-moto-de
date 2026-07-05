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
          <Label
            htmlFor="u-name"
            className="text-[12px] font-bold uppercase tracking-[1.5px] text-muted mb-2"
          >
            Ime
          </Label>
          <Input
            id="u-name"
            name="name"
            required
            placeholder="Ivan Ivić"
            className="bg-background border-border-strong"
          />
        </div>
        <div>
          <Label
            htmlFor="u-email"
            className="text-[12px] font-bold uppercase tracking-[1.5px] text-muted mb-2"
          >
            E-mail
          </Label>
          <Input
            id="u-email"
            name="email"
            type="email"
            required
            placeholder="ivan@kupiauto.de"
            className="bg-background border-border-strong"
          />
        </div>
        <div>
          <Label
            htmlFor="u-password"
            className="text-[12px] font-bold uppercase tracking-[1.5px] text-muted mb-2"
          >
            Lozinka
          </Label>
          <Input
            id="u-password"
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Najmanje 6 znakova"
            className="bg-background border-border-strong"
          />
        </div>
        <div>
          <Label
            htmlFor="u-phone"
            className="text-[12px] font-bold uppercase tracking-[1.5px] text-muted mb-2"
          >
            Telefon
          </Label>
          <Input
            id="u-phone"
            name="phone"
            placeholder="+385 ..."
            className="bg-background border-border-strong"
          />
        </div>
        <div>
          <Label
            htmlFor="u-role"
            className="text-[12px] font-bold uppercase tracking-[1.5px] text-muted mb-2"
          >
            Uloga
          </Label>
          <Select
            id="u-role"
            name="role"
            defaultValue="AGENT"
            className="bg-background border-border-strong"
          >
            {toOptions(ROLE_LABEL).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error && (
        <p className="border border-error/40 bg-surface-2 px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}
      {success && (
        <p className="border border-success/40 bg-surface-2 px-3 py-2 text-sm text-success">
          Korisnik je dodan.
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        disabled={pending}
        className="font-display uppercase tracking-[2px]"
      >
        <UserPlus className="size-4" />
        {pending ? "Spremanje..." : "Dodaj korisnika"}
      </Button>
    </form>
  );
}
