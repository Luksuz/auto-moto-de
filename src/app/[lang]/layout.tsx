import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { LanguageProvider } from "@/components/site/language-provider";
import { OrganizationJsonLd } from "@/components/site/structured-data";
import { requireLocale } from "@/lib/i18n/server";
import { LOCALES } from "@/lib/i18n/config";
import { oswald, hanken, manrope } from "@/lib/fonts";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const locale = requireLocale((await params).lang);

  return (
    <div
      className={`${oswald.variable} ${hanken.variable} ${manrope.variable} theme-autocar flex min-h-dvh flex-col bg-background font-body text-foreground`}
    >
      <OrganizationJsonLd />
      <LanguageProvider initialLocale={locale}>
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter locale={locale} />
      </LanguageProvider>
    </div>
  );
}
