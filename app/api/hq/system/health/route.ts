import {NextResponse} from "next/server";
import {currentUser} from "@/lib/session";
import {ownerAccess} from "@/lib/ownerAccess";
import {runtimeReadiness} from "@/lib/runtimeReadiness";

export const dynamic="force-dynamic";

export async function GET(){
 const user=await currentUser();
 if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const access=await ownerAccess(user.id);
 if(!access.hq)return NextResponse.json({error:"Owner access required."},{status:403});

 const result=await runtimeReadiness();
 return NextResponse.json({
  ready:result.ready,
  release:result.release,
  checks:result.checks,
  time:new Date().toISOString()
 },{status:result.ready?200:503});
}
