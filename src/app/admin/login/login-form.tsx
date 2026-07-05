"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      className="w-full font-display font-semibold uppercase tracking-[2px]"
      disabled={pending}
    >
      {pending ? "Prijava..." : "Prijavi se"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label
          htmlFor="email"
          className="text-[12px] font-bold uppercase tracking-[1.5px] text-muted mb-2"
        >
          E-mail
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="ime@email.com"
          className="bg-background border-border-strong"
        />
      </div>
      <div>
        <Label
          htmlFor="password"
          className="text-[12px] font-bold uppercase tracking-[1.5px] text-muted mb-2"
        >
          Lozinka
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="bg-background border-border-strong"
        />
      </div>
      {state.error && (
        <p className="border border-error/40 bg-surface-2 px-3 py-2 text-sm text-error">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
