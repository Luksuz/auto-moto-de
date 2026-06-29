import { LoginForm } from "./login-form";
import { DEALER } from "@/lib/constants";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold tracking-tight text-navy">
            {DEALER.name}
          </div>
          <p className="mt-1 text-sm text-muted">Administracijski panel</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h1 className="mb-1 text-lg font-semibold">Prijava</h1>
          <p className="mb-5 text-sm text-muted">
            Unesite svoje podatke za pristup.
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
