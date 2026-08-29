import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getActiveOrgId, getSessionUser } from "@/lib/auth";
import { getOwnedChatbot } from "@/lib/store";
import { publicUploadUrl, saveUpload } from "@/lib/uploads";

const MAX_BYTES = 1_500_000;
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const orgId = await getActiveOrgId(user);
  if (!orgId) return NextResponse.json({ error: "No clinic selected" }, { status: 403 });

  const form = await request.formData();
  const chatbotId = String(form.get("chatbotId") || "");
  const file = form.get("file");
  if (!chatbotId || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing photo" }, { status: 400 });
  }

  const bot = await getOwnedChatbot(chatbotId, orgId);
  if (!bot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo is too large" }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length < 3 || !bytes.subarray(0, 3).equals(JPEG_MAGIC)) {
    return NextResponse.json({ error: "Upload a JPEG photo" }, { status: 400 });
  }

  const filename = `${chatbotId}-${randomUUID().slice(0, 8)}.jpg`;
  await saveUpload(filename, bytes);
  return NextResponse.json({ url: publicUploadUrl(filename) });
}
