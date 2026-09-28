import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const caption = String(body.caption ?? "").trim().slice(0, 2200);
  const media = Array.isArray(body.media) ? body.media.slice(0, 10) : [];
  if (!caption && media.length === 0) {
    return NextResponse.json({ error: "Add text or media first." }, { status: 400 });
  }

  const post = await db.post.create({
    data: {
      authorId: user.id,
      caption,
      visibility: "PUBLIC",
      media: {
        create: media.map((item: any, position: number) => ({
          type: item.type === "VIDEO" ? "VIDEO" : "IMAGE",
          url: String(item.url),
          posterUrl: item.posterUrl ? String(item.posterUrl) : null,
          position
        }))
      }
    },
    select: { id: true, caption: true, createdAt: true }
  });

  return NextResponse.json({ post }, { status: 201 });
}
