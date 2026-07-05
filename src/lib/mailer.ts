import nodemailer from "nodemailer";
import { LEAD_TYPE_LABEL } from "@/lib/constants";
import type { Lead } from "@prisma/client";

/**
 * Lead notification mail via SMTP (ImprovMX). No-ops when SMTP env vars
 * are absent so local dev and preview deploys work without credentials.
 */
const enabled = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = enabled
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.improvmx.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: false, // STARTTLS on 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

export async function sendLeadNotification(lead: Lead): Promise<void> {
  if (!transporter) return;

  const to = process.env.LEAD_NOTIFY_TO || "insurance@autocareu.com";
  const typeLabel = LEAD_TYPE_LABEL[lead.type];

  await transporter.sendMail({
    from: `"AUTOCAR EU web" <${process.env.SMTP_USER}>`,
    to,
    replyTo: lead.email || undefined,
    subject: `Novi upit (${typeLabel}): ${lead.name}`,
    text: [
      `Tip: ${typeLabel}`,
      `Ime: ${lead.name}`,
      `Telefon: ${lead.phone}`,
      lead.email ? `E-mail: ${lead.email}` : null,
      "",
      lead.message ?? "",
      "",
      `— zaprimljeno ${lead.createdAt.toLocaleString("hr-HR")} · pregled: /admin/leads`,
    ]
      .filter((line) => line !== null)
      .join("\n"),
  });
}
