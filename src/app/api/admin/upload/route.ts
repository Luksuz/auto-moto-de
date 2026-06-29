import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { putObject } from "@/lib/minio";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 15 * 1024 * 1024; // 15MB

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/-+/g, "-");
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

  const uploaded: { url: string; key: string; name: string }[] = [];
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
    const key = `cars/${ts}-${rand}-${safeName(file.name)}`;
    const url = await putObject(key, buf, file.type);
    uploaded.push({ url, key, name: file.name });
  }

  return NextResponse.json({ files: uploaded });
}
