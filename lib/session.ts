import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const COOKIE = "outside_session";
const DAYS = 30;

function digest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + DAYS * 86400000);
  await db.session.create({ data: { userId, tokenHash: digest(token), expiresAt } });
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: digest(token) },
    include: { user: { select: { id:true,email:true,username:true,displayName:true,bio:true,avatarUrl:true,profileVideoUrl:true,privacy:true,messagePrivacy:true,commentPrivacy:true,mentionPrivacy:true,liveInvitePrivacy:true,hideActivity:true,hideConnections:true,verified:true,status:true } } }
  });
  if (!session || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") return null;
  return session.user;
}

export async function destroySession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: digest(token) } });
  (await cookies()).set(COOKIE, "", { httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"lax", path:"/", expires:new Date(0) });
}
