import { NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/auth";
import { putObject } from "@/lib/minio";
// A hand-uploaded phone photo goes through exactly the same sizing as an
// imported one — without the resize below, a 15MB original would be served at
// full size into a 400px card, since Vercel's optimizer is off (next.config.ts)
// and these bytes reach the browser unchanged.
import { FULL_WIDTH, FULL_QUALITY, VARIANTS } from "@/lib/image-sizes.mjs";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 15 * 1024 * 1024; // 15MB

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
      .jpeg({ quality: FULL_QUALITY, mozjpeg: true })
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
