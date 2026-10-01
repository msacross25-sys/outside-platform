import {createHash,randomBytes} from "node:crypto";
import {cookies} from "next/headers";
import {db} from "@/lib/db";
import {requestSecurityMeta} from "@/lib/requestSecurity";

const COOKIE="outside_session";
const DAYS=30;
const TOUCH_INTERVAL_MS=5*60*1000;

function digest(token:string){
 return createHash("sha256").update(token).digest("hex");
}

const userSelect={
 id:true,
 email:true,
 username:true,
 displayName:true,
 bio:true,
 avatarUrl:true,
 profileVideoUrl:true,
 regionCode:true,
 privacy:true,
 messagePrivacy:true,
 commentPrivacy:true,
 mentionPrivacy:true,
 liveInvitePrivacy:true,
 hideActivity:true,
 hideConnections:true,
 verified:true,
 emailVerifiedAt:true,
 status:true
} as const;

export async function createSession(userId:string,request:Request,mfaVerified=false){
 const token=randomBytes(32).toString("base64url");
 const expiresAt=new Date(Date.now()+DAYS*86400000);
 const {ipHash,userAgent}=requestSecurityMeta(request);
 const session=await db.session.create({
  data:{
   userId,
   tokenHash:digest(token),
   expiresAt,
   ipHash,
   userAgent,
   lastSeenAt:new Date(),
   mfaVerifiedAt:mfaVerified?new Date():null
  },
  select:{id:true}
 });
 (await cookies()).set(COOKIE,token,{
  httpOnly:true,
  secure:process.env.NODE_ENV==="production",
  sameSite:"lax",
  path:"/",
  expires:expiresAt
 });
 return session;
}

export async function currentAuth(){
 const token=(await cookies()).get(COOKIE)?.value;
 if(!token)return null;
 const now=new Date();
 const session=await db.session.findUnique({
  where:{tokenHash:digest(token)},
  include:{user:{select:userSelect}}
 });
 if(!session||session.expiresAt<=now||session.user.status!=="ACTIVE"){
  if(session)await db.session.deleteMany({where:{id:session.id}});
  return null;
 }
 if(now.getTime()-session.lastSeenAt.getTime()>=TOUCH_INTERVAL_MS){
  await db.session.update({where:{id:session.id},data:{lastSeenAt:now}});
  session.lastSeenAt=now;
 }
 return {session,user:session.user};
}

export async function currentUser(){
 return (await currentAuth())?.user??null;
}

export async function markCurrentSessionMfaVerified(){
 const auth=await currentAuth();
 if(!auth)return false;
 await db.session.update({where:{id:auth.session.id},data:{mfaVerifiedAt:new Date()}});
 return true;
}

export async function destroySession(){
 const token=(await cookies()).get(COOKIE)?.value;
 if(token)await db.session.deleteMany({where:{tokenHash:digest(token)}});
 (await cookies()).set(COOKIE,"",{
  httpOnly:true,
  secure:process.env.NODE_ENV==="production",
  sameSite:"lax",
  path:"/",
  expires:new Date(0)
 });
}

export async function revokeSessionForUser(userId:string,sessionId:string){
 return db.session.deleteMany({where:{id:sessionId,userId}});
}

export async function revokeOtherSessions(userId:string,currentSessionId:string){
 return db.session.deleteMany({where:{userId,id:{not:currentSessionId}}});
}

export async function revokeAllSessions(userId:string){
 return db.session.deleteMany({where:{userId}});
}
