import {NextResponse} from "next/server";
import {currentAuth,markCurrentSessionMfaVerified} from "@/lib/session";
import {verifyMfaCodeForUser} from "@/lib/mfa";
import {checkAuthRateLimit} from "@/lib/authRateLimit";
import {recordAuthEvent} from "@/lib/authEvents";

export async function POST(request:Request){
 const auth=await currentAuth();
 if(!auth)return NextResponse.json({error:"Sign in required."},{status:401});
 const body=await request.json().catch(()=>null);
 const code=String(body?.code??"").trim();
 if(!code)return NextResponse.json({error:"Authenticator or recovery code required."},{status:400});

 const limit=await checkAuthRateLimit({action:"MFA_VERIFY",identifier:auth.user.id,request,limit:8,windowMs:15*60*1000,blockMs:30*60*1000});
 if(!limit.allowed)return NextResponse.json({error:"Too many MFA attempts. Try again later."},{status:429,headers:{"Retry-After":String(limit.retryAfterSeconds)}});

 const result=await verifyMfaCodeForUser(auth.user.id,code);
 if(!result.ok){
  await recordAuthEvent(request,"MFA_FAILED",auth.user.id);
  return NextResponse.json({error:"That MFA code is not valid."},{status:401});
 }
 await markCurrentSessionMfaVerified();
 await recordAuthEvent(request,result.recoveryUsed?"MFA_RECOVERY_CODE_USED":"MFA_VERIFIED",auth.user.id);
 return NextResponse.json({verified:true,recoveryUsed:result.recoveryUsed});
}
