import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const login = String(body?.login ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!login || !password) return NextResponse.json({error:"Login and password are required."},{status:400});

  const user = await db.user.findFirst({ where: { OR: [{email:login},{username:login}] } });
  if (!user || !verifyPassword(password,user.passwordHash)) return NextResponse.json({error:"Invalid login."},{status:401});
  if (user.status !== "ACTIVE") return NextResponse.json({error:"This account is not currently available."},{status:403});

  await createSession(user.id);
  return NextResponse.json({user:{id:user.id,username:user.username,displayName:user.displayName}});
}
