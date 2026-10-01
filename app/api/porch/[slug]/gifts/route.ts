import {NextResponse} from "next/server";
import {isAtLeast18} from "@/lib/age";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {giftByKey,splitGift} from "@/lib/gifts";
import {verifiedHours} from "@/lib/progression";
import {getLiveMemberAccess} from "@/lib/porchAccess";
import {checkActionLimit} from "@/lib/actionLimit";

export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const limit=await checkActionLimit(request,"live-gift",me.id,10,10000);
 if(!limit.allowed)return NextResponse.json({error:limit.unavailable?"Gifting is temporarily unavailable.":"Gift rate limit reached."},{status:limit.unavailable?503:429,headers:{"Retry-After":String(limit.retryAfterSeconds)}});
 const buyer=await db.user.findUnique({where:{id:me.id},select:{dateOfBirth:true}});
 if(!isAtLeast18(buyer?.dateOfBirth))return NextResponse.json({error:"Purchasing or sending gifts requires an account age of 18 or older."},{status:403});
 const body=await request.json().catch(()=>null),gift=giftByKey(String(body?.giftKey??""));
 if(!gift)return NextResponse.json({error:"Gift not found."},{status:404});
 if(gift.premium&&body?.confirmed!==true)return NextResponse.json({error:"This premium gift requires confirmation.",requiresConfirmation:true},{status:409});
 const access=await getLiveMemberAccess(slug,me.id);
 if(!access||!access.room.giftsEnabled)return NextResponse.json({error:"Gifts can only be sent in an accessible live room."},{status:403});
 const room=access.room,recipient=room.members.find(m=>m.role==="HOST");
 if(!recipient)return NextResponse.json({error:"Host not found."},{status:404});
 if(recipient.userId===me.id)return NextResponse.json({error:"You cannot send a gift to yourself."},{status:400});
 const [recipientFollowers,recipientProgress,hostApplication]=await Promise.all([
  db.follow.count({where:{followingId:recipient.userId}}),
  db.viewingProgress.findUnique({where:{userId:recipient.userId}}),
  db.hostApplication.findUnique({where:{userId:recipient.userId},select:{status:true}})
 ]);
 const recipientHours=verifiedHours(recipientProgress?.verifiedSeconds??0);
 const creatorSharePercent=hostApplication?.status==="APPROVED"&&recipientFollowers>=5000&&recipientHours>=4000?40:30;
 const split=splitGift(gift.valueCents,creatorSharePercent);
 try{
  const transaction=await db.$transaction(async tx=>{
   const wallet=await tx.coinWallet.findUnique({where:{userId:me.id}});
   if(!wallet||wallet.balanceCoins<BigInt(gift.coins))throw new Error("INSUFFICIENT_COINS");
   await tx.coinWallet.update({where:{userId:me.id},data:{balanceCoins:{decrement:BigInt(gift.coins)}}});
   return tx.giftTransaction.create({data:{senderId:me.id,recipientId:recipient.userId,roomId:room.id,giftKey:gift.key,giftName:gift.name,coinCost:BigInt(gift.coins),dollarValueCents:gift.valueCents,creatorShareCents:split.creatorShareCents,platformShareCents:split.platformShareCents,status:"PENDING"}});
  },{isolationLevel:"Serializable"});
  return NextResponse.json({gift:{id:transaction.id,name:gift.name,coins:gift.coins,valueCents:gift.valueCents},creatorSharePercent,creatorShareCents:split.creatorShareCents,platformShareCents:split.platformShareCents});
 }catch(error){
  if(error instanceof Error&&error.message==="INSUFFICIENT_COINS")return NextResponse.json({error:"Not enough coins."},{status:409});
  return NextResponse.json({error:"Gift could not be sent. Please try again."},{status:409});
 }
}
