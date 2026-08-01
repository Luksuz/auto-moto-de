import { NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/auth";
import { putObject } from "@/lib/minio";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 15 * 1024 * 1024; // 15MB

// Vercel's image optimizer is off (next.config.ts), so whatever is stored here is
// exactly what browsers download. Store a normalized 1600px original plus the
// same 400/800 variants the mobile.de importer writes, or a 15MB phone photo
// would be served at full size into a 400px card.
// Keep in sync with VARIANTS in scripts/lib/car-import.mjs.
const FULL_WIDTH = 1600;
const VARIANTS = [
  { name: "medium", width: 800, quality: 76, suffix: "-800" },
  { name: "thumb", width: 400, quality: 72, suffix: "-400" },
] as const;

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/-+/g, "-");
}

/** Strip the extension so variant keys read `<base>-400.jpg`, not `<base>.png-400.jpg`. */
function baseName(name: string) {
  return safeName(name).replace(/\.[a-z0-9]+$/i, "");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files" }, { status: 400 });
  }

  const uploaded: {
    url: string;
    key: string;
    name: string;
    thumbUrl: string;
    thumbKey: string;
    mediumUrl: string;
    mediumKey: string;
  }[] = [];
  for (const file of files) {
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: `Nepodržan format: ${file.type}` },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Datoteka prevelika: ${file.name}` },
        { status: 400 },
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 8);
    const base = `cars/${ts}-${rand}-${baseName(file.name)}`;

    // .rotate() applies EXIF orientation before any resize, so every size comes
    // out the same way up.
    const upright = sharp(buf).rotate();
    const full = await upright
      .clone()
      .resize({ width: FULL_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();

    const key = `${base}.jpg`;
    const url = await putObject(key, full, "image/jpeg");

    const variants: Record<string, string> = {};
    for (const v of VARIANTS) {
      const out = await upright
        .clone()
        .resize({ width: v.width, withoutEnlargement: true })
        .jpeg({ quality: v.quality, mozjpeg: true })
        .toBuffer();
      const vKey = `${base}${v.suffix}.jpg`;
      variants[`${v.name}Url`] = await putObject(vKey, out, "image/jpeg");
      variants[`${v.name}Key`] = vKey;
    }

    uploaded.push({
      url,
      key,
      name: file.name,
      thumbUrl: variants.thumbUrl,
      thumbKey: variants.thumbKey,
      mediumUrl: variants.mediumUrl,
      mediumKey: variants.mediumKey,
    });
  }

  return NextResponse.json({ files: uploaded });
}
