import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {hashPassword} from "@/lib/password";
import {validPassword} from "@/lib/validation";
import {consumeAuthToken} from "@/lib/authTokens";
import {checkAuthRateLimit} from "@/lib/authRateLimit";
import {securityDigest} from "@/lib/requestSecurity";
import {recordAuthEvent} from "@/lib/authEvents";
import {revokeAllSessions} from "@/lib/session";

export async function POST(request:Request){
 const body=await request.json().catch(()=>null);
 const token=String(body?.token??"");
 const password=String(body?.password??"");
 if(!token||!validPassword(password))return NextResponse.json({error:"Use a valid reset link and a password between 10 and 128 characters."},{status:400});

 const identifier=securityDigest(token).slice(0,32);
 const limit=await checkAuthRateLimit({action:"PASSWORD_RESET_CONFIRM",identifier,request,limit:8,windowMs:60*60*1000,blockMs:60*60*1000});
 if(!limit.allowed)return NextResponse.json({error:"Too many reset attempts. Try again later."},{status:429,headers:{"Retry-After":String(limit.retryAfterSeconds)}});

 const authToken=await consumeAuthToken(token,"PASSWORD_RESET");
 if(!authToken)return NextResponse.json({error:"This password reset link is invalid or expired."},{status:400});

 await db.user.update({where:{id:authToken.userId},data:{passwordHash:hashPassword(password),emailVerifiedAt:new Date()}});
 await Promise.all([
  revokeAllSessions(authToken.userId),
  db.authToken.deleteMany({where:{userId:authToken.userId,type:"PASSWORD_RESET",usedAt:null}})
 ]);
 await recordAuthEvent(request,"PASSWORD_RESET_COMPLETED",authToken.userId);
 return NextResponse.json({reset:true});
}
