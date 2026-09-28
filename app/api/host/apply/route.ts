import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function GET(){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const followers=await db.follow.count({where:{followingId:me.id}});
 const application=await db.hostApplication.findUnique({where:{userId:me.id},select:{status:true,appliedAt:true,reviewedAt:true}});
 return NextResponse.json({followers,eligible:followers>=500,application});
}

export async function POST(){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const followers=await db.follow.count({where:{followingId:me.id}});
 if(followers<500)return NextResponse.json({error:"You need at least 500 followers to apply.",followers},{status:403});
 const existing=await db.hostApplication.findUnique({where:{userId:me.id},select:{status:true}});
 if(existing?.status==="APPROVED")return NextResponse.json({error:"You are already an approved host."},{status:409});
 if(existing?.status==="PENDING")return NextResponse.json({error:"Your application is already pending review."},{status:409});
 const application=await db.hostApplication.upsert({where:{userId:me.id},create:{userId:me.id},update:{status:"PENDING",appliedAt:new Date(),reviewedAt:null,reviewedById:null},select:{status:true,appliedAt:true}});
 return NextResponse.json({application},{status:201});
}