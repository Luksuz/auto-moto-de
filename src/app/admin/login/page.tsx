import Image from "next/image";
import { LoginForm } from "./login-form";
import { DEALER } from "@/lib/constants";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-16">
      <div className="w-[400px] max-w-full">
        <div className="mb-8 text-center">
          <Image
            src="/brand/autocar-logo.png"
            alt={DEALER.name}
            width={1522}
            height={424}
            className="mx-auto h-12 w-auto"
          />
        </div>
        <div className="border border-border bg-surface p-10">
          <h1 className="mb-1.5 text-center font-display text-[22px] font-semibold uppercase tracking-[2px] text-foreground">
            Admin prijava
          </h1>
          <div className="mx-auto mb-7 h-[2px] w-[52px] bg-primary" />
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
