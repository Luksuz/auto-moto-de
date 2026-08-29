import * as React from "react";
import { AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "./use-lead-submit";

/**
 * Shared presentational pieces for the dark lead-form panels
 * (financing / problem / insurance). Server-safe — no client hooks.
 */

export function FormShell({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-surface p-[34px]">
      <h2 className="text-center font-display text-[22px] font-semibold uppercase tracking-[2px]">
        {title}
      </h2>
      <div className="mx-auto mb-7 mt-1.5 h-[2px] w-[52px] bg-primary" />
      {children}
      {footer}
    </div>
  );
}

export function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-[7px] block text-[12px] font-bold uppercase tracking-[1.5px] text-muted">
        {label}
        {required ? " *" : null}
      </span>
      {children}
    </label>
  );
}

/** Outcome of an e-mail submission. The WhatsApp buttons navigate away, so
 *  nothing is ever rendered for them. */
export function StatusNote({
  status,
  sentText,
  mailFailedText,
  errorText,
}: {
  status: LeadStatus | null;
  sentText: string;
  mailFailedText: string;
  errorText: string;
}) {
  if (!status) return null;

  const ok = status.kind === "sent";
  const text =
    status.kind === "sent"
      ? sentText
      : status.kind === "mailFailed"
        ? mailFailedText
        : (status.message ?? errorText);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "mt-4 flex items-start gap-3 border px-4 py-3.5 text-[13.5px]",
        ok
          ? "border-[#2A4030] bg-[#16241B] text-[#B7E3C4]"
          : "border-[#4A3320] bg-[#2A1D12] text-[#F0C48A]",
      )}
    >
      {ok ? (
        <CheckCircle2 className="mt-px size-4 shrink-0" />
      ) : (
        <AlertTriangle className="mt-px size-4 shrink-0" />
      )}
      <span>{text}</span>
    </div>
  );
}

export function PrivacyNote({ text }: { text: string }) {
  return (
    <div className="my-5 flex items-center gap-3 border border-[#2E2A1E] bg-surface-2 px-4 py-3.5 text-[13.5px] text-muted">
      <Lock className="size-4 shrink-0 text-primary" />
      <span>{text}</span>
    </div>
  );
}
