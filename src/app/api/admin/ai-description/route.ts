import { OpenRouter } from "@openrouter/sdk";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  imageUrls?: string[];
  context?: {
    brand?: string;
    model?: string;
    title?: string;
    firstRegistration?: string;
    fuelType?: string;
    transmission?: string;
    powerKs?: number | string;
    powerKw?: number | string;
    mileageKm?: number | string;
    bodyType?: string;
    priceEur?: number | string;
    equipment?: string[];
  };
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return new Response("OPENROUTER_API_KEY nije postavljen.", { status: 500 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response("Neispravan zahtjev.", { status: 400 });
  }

  const ctx = body.context ?? {};
  const images = (body.imageUrls ?? []).slice(0, 6);

  const specLines: string[] = [];
  const add = (label: string, value?: string | number) => {
    if (value !== undefined && value !== null && `${value}`.trim() !== "")
      specLines.push(`- ${label}: ${value}`);
  };
  add("Naslov", ctx.title);
  add("Marka", ctx.brand);
  add("Model", ctx.model);
  add("Prva registracija", ctx.firstRegistration);
  add("Karoserija", ctx.bodyType);
  add("Gorivo", ctx.fuelType);
  add("Mjenjač", ctx.transmission);
  add("Snaga (KS)", ctx.powerKs);
  add("Snaga (kW)", ctx.powerKw);
  add("Kilometraža (km)", ctx.mileageKm);
  add("Cijena (EUR)", ctx.priceEur);
  if (ctx.equipment?.length) add("Oprema", ctx.equipment.join(", "));

  const prompt = `Ti si iskusan auto-prodavač i copywriter. Napiši uvjerljiv, točan i SEO prilagođen opis rabljenog vozila na HRVATSKOM jeziku za oglas.

Pravila:
- Duljina 120-200 riječi.
- Koristi navedene specifikacije i, ako su priložene fotografije, spomeni ono što je stvarno vidljivo na njima (boja, stanje, felge, interijer).
- Naglasi prednosti i vrijednost vozila, ali NE izmišljaj činjenice koje nisu navedene niti vidljive.
- Piši tečno, profesionalno, u trećem licu, bez nabrajanja u natuknicama.
- Ne navodi cijenu kao zaključak ako nije navedena.

Specifikacije vozila:
${specLines.join("\n") || "(nema dodatnih specifikacija)"}`;

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; imageUrl: { url: string } }
  > = [{ type: "text", text: prompt }];
  for (const url of images) {
    content.push({ type: "image_url", imageUrl: { url } });
  }

  const openrouter = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

  try {
    const stream = await openrouter.chat.send({
      chatRequest: {
        model: "google/gemini-3.1-flash-lite",
        stream: true,
        messages: [{ role: "user", content }],
      },
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices?.[0]?.delta?.content;
            if (text) controller.enqueue(encoder.encode(text));
          }
        } catch {
          controller.enqueue(
            encoder.encode("\n[Greška pri generiranju opisa.]"),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response(
      "Generiranje opisa trenutno nije moguće. Pokušajte ponovno.",
      { status: 502 },
    );
  }
}
