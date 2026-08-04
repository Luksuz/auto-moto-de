import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { LanguageProvider } from "@/components/site/language-provider";
import { OrganizationJsonLd } from "@/components/site/structured-data";
import { getLocale } from "@/lib/i18n/server";
import { oswald, hanken, manrope } from "@/lib/fonts";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <div
      lang={locale}
      className={`${oswald.variable} ${hanken.variable} ${manrope.variable} theme-autocar flex min-h-dvh flex-col bg-background font-body text-foreground`}
    >
      <OrganizationJsonLd />
      <LanguageProvider initialLocale={locale}>
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </LanguageProvider>
    </div>
  );
}
