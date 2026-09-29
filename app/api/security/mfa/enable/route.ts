import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentAuth,markCurrentSessionMfaVerified} from "@/lib/session";
import {decryptMfaSecret,generateRecoveryCodes,hashRecoveryCode,verifyTotp} from "@/lib/mfa";
import {recordAuthEvent} from "@/lib/authEvents";

export async function POST(request:Request){
 const auth=await currentAuth();
 if(!auth)return NextResponse.json({error:"Sign in required."},{status:401});
 const body=await request.json().catch(()=>null);
 const code=String(body?.code??"").trim();

 const credential=await db.mfaCredential.findUnique({where:{userId:auth.user.id}});
 if(!credential?.pendingSecretEncrypted)return NextResponse.json({error:"Start MFA setup first."},{status:409});
 const secret=decryptMfaSecret(credential.pendingSecretEncrypted);
 if(!verifyTotp(secret,code))return NextResponse.json({error:"That authenticator code is not valid."},{status:400});

 const recoveryCodes=generateRecoveryCodes();
 await db.mfaCredential.update({
  where:{userId:auth.user.id},
  data:{
   secretEncrypted:credential.pendingSecretEncrypted,
   pendingSecretEncrypted:null,
   enabledAt:new Date(),
   recoveryCodesJson:JSON.stringify(recoveryCodes.map(hashRecoveryCode))
  }
 });
 await markCurrentSessionMfaVerified();
 await recordAuthEvent(request,"MFA_ENABLED",auth.user.id);
 return NextResponse.json({enabled:true,recoveryCodes});
}
