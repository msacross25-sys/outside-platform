import {NextResponse} from "next/server";
import {currentAuth} from "@/lib/session";
import {acceptCurrentPolicies,missingRequiredPolicies} from "@/lib/policyAcceptance";
import {recordAuthEvent} from "@/lib/authEvents";

export async function GET(){
 const auth=await currentAuth();
 if(!auth)return NextResponse.json({error:"Sign in required."},{status:401});
 const missing=await missingRequiredPolicies(auth.user.id);
 return NextResponse.json({missing,required:missing.length>0});
}

export async function POST(request:Request){
 const auth=await currentAuth();
 if(!auth)return NextResponse.json({error:"Sign in required."},{status:401});
 const body=await request.json().catch(()=>null);
 if(body?.acceptTerms!==true||body?.acceptPrivacy!==true||body?.acceptCommunityGuidelines!==true){
  return NextResponse.json({error:"Accept all required OUTSiiDE policies to continue."},{status:400});
 }
 const result=await acceptCurrentPolicies(auth.user.id,request);
 await recordAuthEvent(request,"POLICIES_ACCEPTED",auth.user.id);
 return NextResponse.json({accepted:true,acceptedAt:result.acceptedAt});
}
