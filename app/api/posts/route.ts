import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.authorId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const caption = String(body.caption ?? "").trim().slice(0, 2200);
  const post = await db.post.create({
    data: { authorId: String(body.authorId), caption, visibility: "PUBLIC" },
    select: { id: true, caption: true, createdAt: true }
  });
  return NextResponse.json({ post }, { status: 201 });
}
