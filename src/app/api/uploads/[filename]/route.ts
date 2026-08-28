import { NextResponse } from "next/server";
import { hasObjectStorage, isSafeUploadName, publicUploadUrl, readUpload } from "@/lib/uploads";

export async function GET(_request: Request, ctx: { params: Promise<{ filename: string }> }) {
  const { filename } = await ctx.params;
  if (!isSafeUploadName(filename)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (hasObjectStorage()) {
    return NextResponse.redirect(publicUploadUrl(filename), 302);
  }
  const bytes = await readUpload(filename);
  if (!bytes) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
