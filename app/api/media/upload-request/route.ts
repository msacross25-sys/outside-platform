import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { mediaAllowed, mediaKind } from "@/lib/media";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const type = String(body?.type ?? "");
  const size = Number(body?.size ?? 0);

  if (!mediaAllowed(type, size)) {
    return NextResponse.json({ error: "Unsupported media type or size." }, { status: 400 });
  }

  return NextResponse.json({
    ready: false,
    kind: mediaKind(type),
    message: "Media storage provider connection is required before uploads can begin."
  }, { status: 503 });
}
