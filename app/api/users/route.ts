import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { normalizeUsername, validPassword, validUsername } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const email = String(body.email ?? "").trim().toLowerCase();
  const username = normalizeUsername(String(body.username ?? ""));
  const displayName = String(body.displayName ?? "").trim();
  const password = String(body.password ?? "");

  if (!email.includes("@") || !validUsername(username) || !displayName || !validPassword(password)) {
    return NextResponse.json({ error: "Check email, username, display name and password." }, { status: 400 });
  }

  try {
    const user = await db.user.create({
      data: { email, username, displayName, passwordHash: hashPassword(password) },
      select: { id: true, username: true, displayName: true, createdAt: true }
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Email or username is already in use." }, { status: 409 });
  }
}
