// Benchmark candidate models on real cached detail pages against the data
// already in the database (which was verified against the source pages).
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createModel, clean, CAR_SCHEMA, CAR_PROMPT, blocksToText } from "./lib/mobilede.mjs";
import { loadEnv } from "./lib/clients.mjs";

loadEnv();
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const MODELS = process.argv.slice(2);
const IDS = ["450687678", "446850642", "461653360"]; // BMW 320d, Audi RS3, Škoda Kodiaq

const refs = {};
for (const id of IDS) {
  const c = await prisma.car.findUnique({ where: { sourceId: `mobilede:${id}` } });
  refs[id] = c;
}

const catalog = JSON.parse(readFileSync(process.env.MODELS_FILE, "utf8")).data;
// ":nitro" / ":floor" are routing suffixes, not catalog entries — price the base model.
const priceOf = (id) => {
  const base = id.split(":")[0];
  const m = catalog.find((x) => x.id === id) ?? catalog.find((x) => x.id === base);
  return m ? { in: +m.pricing.prompt, out: +m.pricing.completion } : { in: 0, out: 0 };
};

async function benchmark(model) {
  const extract = createModel({ apiKey: process.env.OPENROUTER_API_KEY, model, log: () => {} });
  let score = 0, max = 0, tin = 0, tout = 0, equip = 0, refEquip = 0, descOk = 0, errors = 0;
  const t0 = Date.now();

  // All three pages at once as well — they are independent.
  await Promise.all(IDS.map(async (id) => {
    const html = process.env.MD_DIR
      ? readFileSync(`${process.env.MD_DIR}/${id}.md`, "utf8")
      : clean(readFileSync(`.cache/mobilede-html/${id}.html`, "utf8"));
    const ref = refs[id];
    try {
      const res = await Promise.race([
        extract(html, { schema: CAR_SCHEMA, prompt: CAR_PROMPT, name: "vehicle", label: id }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout after 150s")), 150_000)),
      ]);
      const car = res.data ?? res;
      tin += res.usage?.prompt_tokens ?? 0;
      tout += res.usage?.completion_tokens ?? 0;
      const checks = [
        car.price_eur === ref.priceEur,
        car.mileage_km === ref.mileageKm,
        car.first_registration === ref.firstRegistration,
        car.power_kw === ref.powerKw,
        car.fuel_type === ref.fuelType,
        car.transmission === ref.transmission,
        car.body_type === ref.bodyType,
      ];
      score += checks.filter(Boolean).length;
      max += checks.length;
      equip += (car.equipment ?? []).length;
      refEquip += ref.equipment.length;
      const text = blocksToText(car.description_blocks);
      if (text && text.includes("\n• ")) descOk++;
    } catch (err) {
      errors++;
      max += 7;
      refEquip += ref.equipment.length;
      lastError[model] = String(err.message).slice(0, 70);
    }
  }));

  const secs = (Date.now() - t0) / 1000;
  const price = priceOf(model);
  const perCar = (tin / IDS.length) * price.in + (tout / IDS.length) * price.out;
  return { model, score, max, equip, refEquip, descOk, errors, secs, perCar };
}

const lastError = {};
const line = (r) => {
  if (r.fatal) return r.model.padEnd(38) + "FATAL " + r.fatal;
  const acc = ((r.score / r.max) * 100).toFixed(0) + "%";
  return (
    r.model.padEnd(38) +
    `${String(r.score + "/" + r.max).padStart(5)} ${acc.padStart(4)}  ` +
    `${String(r.equip).padStart(3)}/${r.refEquip}  ${r.descOk}/3  ${r.errors}  ` +
    `${r.secs.toFixed(0).padStart(4)}s  $${(r.perCar * 1000).toFixed(2)}` +
    (lastError[r.model] ? `   (${lastError[r.model]})` : "")
  );
};

console.log("model".padEnd(38) + "fields  equip     desc  err   wall   $/1000");
// Print each model the moment it finishes, so a slow provider never hides the rest.
await Promise.all(
  MODELS.map((m) =>
    benchmark(m)
      .catch((e) => ({ model: m, fatal: String(e.message).slice(0, 60) }))
      .then((r) => console.log(line(r))),
  ),
);

await prisma.$disconnect();
