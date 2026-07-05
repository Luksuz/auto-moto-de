import { prisma } from "@/lib/prisma";
import { SITE_URL, DEALER } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * llms.txt — AI-friendly site summary per https://llmstxt.org
 * (H1 title, blockquote summary, H2-delimited markdown link lists;
 * "Optional" section marks content skippable in short contexts).
 */
export async function GET() {
  let carLines: string[] = [];
  try {
    const cars = await prisma.car.findMany({
      where: { published: true },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      select: {
        slug: true,
        title: true,
        priceEur: true,
        firstRegistration: true,
        mileageKm: true,
        fuelType: true,
      },
      take: 30,
    });
    carLines = cars.map(
      (c) =>
        `- [${c.title}](${SITE_URL}/vozila/${c.slug}): ${c.firstRegistration.split("/")[1]}., ${new Intl.NumberFormat("de-DE").format(c.mileageKm)} km, ${formatPrice(c.priceEur)}`,
    );
  } catch {
    // DB unavailable — serve the static portion only.
  }

  const body = `# AUTOCAR EU

> AUTOCAR EU je prodavač rabljenih vozila iz Njemačke i Austrije (od 2018.) za kupce koji rade u Njemačkoj i Austriji. Preko 350 provjerenih vozila na stanju, garancija do 3 godine, financiranje i osiguranje uz osobnog savjetnika. Sadržaj je na hrvatskom i njemačkom jeziku.

Kontakt: WhatsApp DE ${DEALER.whatsappDePretty}, WhatsApp HR ${DEALER.whatsappHrPretty}, e-mail ${DEALER.email}.

## Ponuda vozila

- [Sva vozila](${SITE_URL}/vozila): Kompletna ponuda s filtrima po marki, modelu, godištu i cijeni
${carLines.join("\n")}

## Usluge

- [Financiranje](${SITE_URL}/financiranje): Upit za financiranje vozila — najpovoljniji uvjeti za zaposlene u Njemačkoj i Austriji, brza obrada
- [Osiguranje](${SITE_URL}/osiguranje): Auto, kasko i ostala osiguranja za Njemačku i Austriju — osobni savjetnik Goran Kanjir (Allfinanz)
- [Prijava problema](${SITE_URL}/prijavi-problem): Obrazac za prijavu problema s kupljenim vozilom

## Tvrtka

- [O nama](${SITE_URL}/o-nama): 8 godina iskustva, 350+ vozila na stanju, 1000+ zadovoljnih kupaca
- [Postupak kupnje](${SITE_URL}/postupak-kupnje): Kako teče kupnja vozila
- [Uvjeti financiranja](${SITE_URL}/uvjeti-financiranja): Kamatne stope i uvjeti kreditiranja

## Optional

- [Tijek preuzimanja](${SITE_URL}/tijek-preuzimanja): Kako izgleda preuzimanje vozila
- [Termin za preuzimanje](${SITE_URL}/termin-za-preuzimanje): Dogovor termina preuzimanja
- [Reklamacije](${SITE_URL}/reklamacije): Postupak reklamacije
- [Impressum](${SITE_URL}/impressum): Pravne informacije
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
