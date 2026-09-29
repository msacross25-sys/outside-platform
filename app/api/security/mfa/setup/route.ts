import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentAuth} from "@/lib/session";
import {encryptMfaSecret,generateMfaSecret,otpAuthUri} from "@/lib/mfa";
import {recordAuthEvent} from "@/lib/authEvents";

export async function POST(request:Request){
 const auth=await currentAuth();
 if(!auth)return NextResponse.json({error:"Sign in required."},{status:401});

 const existing=await db.mfaCredential.findUnique({where:{userId:auth.user.id}});
 if(existing?.enabledAt&&!auth.session.mfaVerifiedAt){
  return NextResponse.json({error:"Verify your current MFA before changing it."},{status:403});
 }

 const secret=generateMfaSecret();
 await db.mfaCredential.upsert({
  where:{userId:auth.user.id},
  create:{userId:auth.user.id,pendingSecretEncrypted:encryptMfaSecret(secret)},
  update:{pendingSecretEncrypted:encryptMfaSecret(secret)}
 });
 await recordAuthEvent(request,"MFA_SETUP_STARTED",auth.user.id);
 return NextResponse.json({secret,otpauthUri:otpAuthUri(auth.user.email,secret)});
}
