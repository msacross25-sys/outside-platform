import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { verifiedHours } from "@/lib/progression";
export async function GET(){
 const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const [followers,progress,application]=await Promise.all([db.follow.count({where:{followingId:me.id}}),db.viewingProgress.findUnique({where:{userId:me.id}}),db.hostApplication.findUnique({where:{userId:me.id},select:{status:true,appliedAt:true,reviewedAt:true,agreementAcceptedAt:true}})]);
 const hours=verifiedHours(progress?.verifiedSeconds??0);
 return NextResponse.json({followers,verifiedViewingHours:hours,goodStanding:me.status==="ACTIVE",eligible:followers>=2500&&hours>=3000&&me.status==="ACTIVE",application});
}
export async function POST(request:Request){
 const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const body=await request.json().catch(()=>null);if(body?.acceptHostAgreement!==true)return NextResponse.json({error:"You must accept the Host Agreement before applying."},{status:400});
 const [followers,progress]=await Promise.all([db.follow.count({where:{followingId:me.id}}),db.viewingProgress.findUnique({where:{userId:me.id}})]);const hours=verifiedHours(progress?.verifiedSeconds??0);
 if(me.status!=="ACTIVE")return NextResponse.json({error:"Your account must be in good standing to apply."},{status:403});
 if(followers<2500||hours<3000)return NextResponse.json({error:"Host eligibility requires 2,500 followers and 3,000 verified viewing hours.",followers,verifiedViewingHours:hours},{status:403});
 const existing=await db.hostApplication.findUnique({where:{userId:me.id},select:{status:true}});
 if(existing?.status==="APPROVED")return NextResponse.json({error:"You are already an approved host."},{status:409});
 if(existing?.status==="PENDING")return NextResponse.json({error:"Your application is already pending review."},{status:409});
 const application=await db.hostApplication.upsert({where:{userId:me.id},create:{userId:me.id,agreementAcceptedAt:new Date()},update:{status:"PENDING",appliedAt:new Date(),reviewedAt:null,reviewedById:null,agreementAcceptedAt:new Date()},select:{status:true,appliedAt:true}});
 return NextResponse.json({application},{status:201});
}