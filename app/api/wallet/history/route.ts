import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
export async function GET(){
 const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const [gifts,payouts]=await Promise.all([
  db.giftTransaction.findMany({where:{recipientId:me.id},orderBy:{createdAt:"desc"},take:50,select:{id:true,giftName:true,creatorShareCents:true,status:true,createdAt:true,refundStatus:true}}),
  db.creatorPayout.findMany({where:{creatorId:me.id},orderBy:{createdAt:"desc"},take:25,select:{id:true,amountCents:true,status:true,scheduledFor:true,paidAt:true,createdAt:true}})
 ]);
 return NextResponse.json({gifts,payouts});
}