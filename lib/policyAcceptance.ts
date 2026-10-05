import {db} from "@/lib/db";
import {REQUIRED_POLICIES} from "@/lib/policies";
import {requestSecurityMeta} from "@/lib/requestSecurity";

export async function missingRequiredPolicies(userId:string){
 const rows=await db.policyAcceptance.findMany({
  where:{userId},
  select:{policyType:true,policyVersion:true}
 });
 const accepted=new Set(rows.map(x=>x.policyType+":"+x.policyVersion));
 return REQUIRED_POLICIES.filter(p=>!accepted.has(p.type+":"+p.version));
}

export async function hasCurrentPolicyAcceptances(userId:string){
 return (await missingRequiredPolicies(userId)).length===0;
}

export async function acceptCurrentPolicies(userId:string,request:Request){
 const {ipHash,userAgent}=requestSecurityMeta(request);
 const now=new Date();
 await db.policyAcceptance.createMany({
  data:REQUIRED_POLICIES.map(p=>({
   userId,
   policyType:p.type,
   policyVersion:p.version,
   acceptedAt:now,
   ipHash,
   userAgent,
   metadataJson:JSON.stringify({source:"ACCOUNT_POLICY_GATE"})
  })),
  skipDuplicates:true
 });
 return {acceptedAt:now};
}
