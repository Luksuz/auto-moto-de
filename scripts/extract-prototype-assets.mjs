// One-off extractor: pulls brand assets out of the bundled design prototype
// ("AutocarEU Prototip v2 - standalone.html") into public/brand/.
// Usage: node scripts/extract-prototype-assets.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "AutocarEU Prototip v2 - standalone.html"), "utf8");

const match = html.match(/<script type="__bundler\/manifest">\s*([\s\S]*?)\s*<\/script>/);
if (!match) throw new Error("Manifest script tag not found in prototype HTML");
const manifest = JSON.parse(match[1]);

const ASSETS = {
  "2a58e5ad-ab7d-42af-8991-ded9ab2d85f9": "autocar-logo.png",
  "ff49e7d2-01de-449a-b2d5-13b600ee896e": "goran-kanjir.png",
  "62c9d061-6de1-4d1d-9fd5-72c03a5a0cb9": "hero.jpg",
};

mkdirSync(join(root, "public/brand"), { recursive: true });
for (const [uuid, filename] of Object.entries(ASSETS)) {
  const entry = manifest[uuid];
  if (!entry) throw new Error(`Asset ${uuid} (${filename}) missing from manifest`);
  if (entry.compressed) throw new Error(`Asset ${uuid} is compressed — add gunzip step`);
  writeFileSync(join(root, "public/brand", filename), Buffer.from(entry.data, "base64"));
  console.log(`Wrote public/brand/${filename} (${entry.mime})`);
}
