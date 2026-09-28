import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { giftByKey,splitGift } from "@/lib/gifts";

export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const body=await request.json().catch(()=>null);const gift=giftByKey(String(body?.giftKey??""));
 if(!gift)return NextResponse.json({error:"Gift not found."},{status:404});
 if(gift.premium&&body?.confirmed!==true)return NextResponse.json({error:"This premium gift requires confirmation.",requiresConfirmation:true},{status:409});
 const room=await db.porchRoom.findUnique({where:{slug},include:{members:{select:{userId:true,role:true}}}});
 if(!room||room.status!=="LIVE")return NextResponse.json({error:"Gifts can only be sent in a live room."},{status:409});
 const senderMember=room.members.find(m=>m.userId===me.id);if(!senderMember)return NextResponse.json({error:"Join the room before sending a gift."},{status:403});
 const recipient=room.members.find(m=>m.role==="HOST");if(!recipient)return NextResponse.json({error:"Host not found."},{status:404});
 if(recipient.userId===me.id)return NextResponse.json({error:"You cannot send a gift to yourself."},{status:400});
 const split=splitGift(gift.valueCents);
 try{
  const transaction=await db.$transaction(async tx=>{
   const wallet=await tx.coinWallet.findUnique({where:{userId:me.id}});
   if(!wallet||wallet.balanceCoins<BigInt(gift.coins))throw new Error("INSUFFICIENT_COINS");
   await tx.coinWallet.update({where:{userId:me.id},data:{balanceCoins:{decrement:BigInt(gift.coins)}}});
   return tx.giftTransaction.create({data:{senderId:me.id,recipientId:recipient.userId,roomId:room.id,giftKey:gift.key,giftName:gift.name,coinCost:BigInt(gift.coins),dollarValueCents:gift.valueCents,creatorShareCents:split.creatorShareCents,platformShareCents:split.platformShareCents,status:"PENDING"}});
  },{isolationLevel:"Serializable"});
  return NextResponse.json({gift:{id:transaction.id,name:gift.name,coins:gift.coins,valueCents:gift.valueCents},creatorShareCents:split.creatorShareCents,platformShareCents:split.platformShareCents});
 }catch(error){
  if(error instanceof Error&&error.message==="INSUFFICIENT_COINS")return NextResponse.json({error:"Not enough coins."},{status:409});
  return NextResponse.json({error:"Gift could not be sent. Please try again."},{status:409});
 }
}