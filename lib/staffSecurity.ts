import {db} from "@/lib/db";
import {currentAuth} from "@/lib/session";

export async function staffSecurityState(expectedUserId?:string){
 const auth=await currentAuth();
 if(!auth||expectedUserId&&auth.user.id!==expectedUserId){
  return {authorized:false,setupRequired:false,challengeRequired:false,auth:null,staff:null};
 }
 const staff=await db.staffProfile.findUnique({where:{userId:auth.user.id}});
 if(!staff?.active){
  return {authorized:false,setupRequired:false,challengeRequired:false,auth,staff:null};
 }
 if(!staff.mfaRequired){
  return {authorized:true,setupRequired:false,challengeRequired:false,auth,staff};
 }
 const credential=await db.mfaCredential.findUnique({where:{userId:auth.user.id},select:{enabledAt:true}});
 const setupRequired=!credential?.enabledAt;
 const challengeRequired=Boolean(credential?.enabledAt&&!auth.session.mfaVerifiedAt);
 return {
  authorized:!setupRequired&&!challengeRequired,
  setupRequired,
  challengeRequired,
  auth,
  staff
 };
}
