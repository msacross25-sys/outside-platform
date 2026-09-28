import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { levelFor,nextLevel,verifiedHours } from "@/lib/progression";

export async function GET(){
 const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const [followers,progress,profile]=await Promise.all([db.follow.count({where:{followingId:me.id}}),db.viewingProgress.findUnique({where:{userId:me.id}}),db.creatorProfile.findUnique({where:{userId:me.id},select:{status:true,activatedAt:true}})]);
 const hours=verifiedHours(progress?.verifiedSeconds??0);const level=levelFor(followers,hours);const next=nextLevel(followers,hours);
 return NextResponse.json({followers,verifiedViewingHours:hours,eligible:followers>=500&&hours>=1000,level,nextLevel:next,profile});
}
export async function POST(){
 const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const [followers,progress]=await Promise.all([db.follow.count({where:{followingId:me.id}}),db.viewingProgress.findUnique({where:{userId:me.id}})]);
 const hours=verifiedHours(progress?.verifiedSeconds??0);
 if(followers<500||hours<1000)return NextResponse.json({error:"Creator features require 500 followers and 1,000 verified viewing hours.",followers,verifiedViewingHours:hours},{status:403});
 const profile=await db.creatorProfile.upsert({where:{userId:me.id},create:{userId:me.id,status:"ACTIVE",activatedAt:new Date()},update:{status:"ACTIVE",activatedAt:new Date()},select:{status:true,activatedAt:true}});
 return NextResponse.json({profile});
}