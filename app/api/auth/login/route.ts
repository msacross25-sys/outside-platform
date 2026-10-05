import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {verifyPassword} from "@/lib/password";
import {createSession} from "@/lib/session";
import {checkAuthRateLimit,clearAuthRateLimit} from "@/lib/authRateLimit";
import {recordAuthEvent} from "@/lib/authEvents";
import {isAtLeast18} from "@/lib/age";

const WINDOW=15*60*1000;

export async function POST(request:Request){
 const body=await request.json().catch(()=>null);
 const login=String(body?.login??"").trim().toLowerCase();
 const password=String(body?.password??"");
 if(!login||!password)return NextResponse.json({error:"Login and password are required."},{status:400});

 const limit=await checkAuthRateLimit({action:"LOGIN",identifier:login,request,limit:8,windowMs:WINDOW,blockMs:WINDOW});
 if(!limit.allowed){
  return NextResponse.json({error:"Too many sign-in attempts. Try again later."},{status:429,headers:{"Retry-After":String(limit.retryAfterSeconds)}});
 }

 const user=await db.user.findFirst({where:{OR:[{email:login},{username:login}]}});
 if(!user||!verifyPassword(password,user.passwordHash)){
  await recordAuthEvent(request,"LOGIN_FAILED",user?.id??null);
  return NextResponse.json({error:"Invalid login."},{status:401});
 }
 if(user.status!=="ACTIVE"){
  await recordAuthEvent(request,"LOGIN_BLOCKED_ACCOUNT",user.id);
  return NextResponse.json({error:"This account is not currently available."},{status:403});
 }
 if(user.dateOfBirth&&!isAtLeast18(user.dateOfBirth)){
  await recordAuthEvent(request,"LOGIN_BLOCKED_UNDERAGE",user.id);
  return NextResponse.json({error:"OUTSiiDE is for adults age 18 and older."},{status:403});
 }
 if(!user.emailVerifiedAt){
  await recordAuthEvent(request,"LOGIN_EMAIL_UNVERIFIED",user.id);
  return NextResponse.json({error:"Verify your email before signing in.",code:"EMAIL_VERIFICATION_REQUIRED"},{status:403});
 }

 await clearAuthRateLimit("LOGIN",login,request);
 const [credential,staff]=await Promise.all([
  db.mfaCredential.findUnique({where:{userId:user.id},select:{enabledAt:true}}),
  db.staffProfile.findUnique({where:{userId:user.id},select:{active:true,mfaRequired:true}})
 ]);
 await createSession(user.id,request,false);
 await recordAuthEvent(request,"LOGIN_SUCCESS",user.id);

 const mfaRequired=Boolean(credential?.enabledAt);
 const mfaSetupRequired=Boolean(staff?.active&&staff.mfaRequired&&!credential?.enabledAt);
 return NextResponse.json({
  user:{id:user.id,username:user.username,displayName:user.displayName},
  ageVerificationRequired:!user.dateOfBirth,
  mfaRequired,
  mfaSetupRequired
 });
}
