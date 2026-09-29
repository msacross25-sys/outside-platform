import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentAuth} from "@/lib/session";

export async function GET(){
 const auth=await currentAuth();
 if(!auth)return NextResponse.json({error:"Sign in required."},{status:401});
 const [credential,staff]=await Promise.all([
  db.mfaCredential.findUnique({where:{userId:auth.user.id},select:{enabledAt:true,pendingSecretEncrypted:true}}),
  db.staffProfile.findUnique({where:{userId:auth.user.id},select:{active:true,mfaRequired:true,role:true}})
 ]);
 const enabled=Boolean(credential?.enabledAt);
 const requiredForStaff=Boolean(staff?.active&&staff.mfaRequired);
 return NextResponse.json({
  enabled,
  requiredForStaff,
  staffRole:staff?.active?staff.role:null,
  sessionVerified:Boolean(auth.session.mfaVerifiedAt),
  setupRequired:requiredForStaff&&!enabled,
  challengeRequired:enabled&&!auth.session.mfaVerifiedAt,
  setupPending:Boolean(credential?.pendingSecretEncrypted)
 });
}
