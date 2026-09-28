import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function GET(){
 const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const followers=await db.follow.count({where:{followingId:me.id}});
 const profile=await db.creatorProfile.findUnique({where:{userId:me.id},select:{status:true,activatedAt:true}});
 return NextResponse.json({followers,eligible:followers>=300,profile});
}
export async function POST(){
 const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const followers=await db.follow.count({where:{followingId:me.id}});
 if(followers<300)return NextResponse.json({error:"Creator features require at least 300 followers.",followers},{status:403});
 const profile=await db.creatorProfile.upsert({where:{userId:me.id},create:{userId:me.id,status:"ACTIVE",activatedAt:new Date()},update:{status:"ACTIVE",activatedAt:new Date()},select:{status:true,activatedAt:true}});
 return NextResponse.json({profile});
}