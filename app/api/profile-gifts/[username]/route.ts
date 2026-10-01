import {NextResponse} from "next/server";
import {isAtLeast18} from "@/lib/age";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {giftByKey,splitGift} from "@/lib/gifts";
import {verifiedHours} from "@/lib/progression";
import {createNotification} from "@/lib/notifications";

export async function POST(request:Request,{params}:{params:Promise<{username:string}>}){
 const {username}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const buyer=await db.user.findUnique({where:{id:me.id},select:{dateOfBirth:true}});
 if(!isAtLeast18(buyer?.dateOfBirth))return NextResponse.json({error:"Purchasing or sending gifts requires an account age of 18 or older."},{status:403});

 const body=await request.json().catch(()=>null);
 const gift=giftByKey(String(body?.giftKey??""));
 if(!gift)return NextResponse.json({error:"Gift not found."},{status:404});
 if(gift.premium&&body?.confirmed!==true)return NextResponse.json({error:"Confirmation required."},{status:409});

 const recipient=await db.user.findUnique({where:{username:username.toLowerCase()},select:{id:true,username:true,status:true}});
 if(!recipient||recipient.status!=="ACTIVE")return NextResponse.json({error:"Creator not found."},{status:404});
 if(recipient.id===me.id)return NextResponse.json({error:"You cannot gift yourself."},{status:400});

 const blocked=await db.block.count({where:{OR:[{blockerId:me.id,blockedId:recipient.id},{blockerId:recipient.id,blockedId:me.id}]}});
 if(blocked)return NextResponse.json({error:"Gifting is unavailable for this account."},{status:403});

 const [followers,progress,app]=await Promise.all([
  db.follow.count({where:{followingId:recipient.id}}),
  db.viewingProgress.findUnique({where:{userId:recipient.id}}),
  db.hostApplication.findUnique({where:{userId:recipient.id}})
 ]);
 const share=app?.status==="APPROVED"&&followers>=5000&&verifiedHours(progress?.verifiedSeconds??0)>=4000?40:30;
 const split=splitGift(gift.valueCents,share);

 try{
  const row=await db.$transaction(async t=>{
   const wallet=await t.coinWallet.findUnique({where:{userId:me.id}});
   if(!wallet||wallet.balanceCoins<BigInt(gift.coins))throw new Error("COINS");
   await t.coinWallet.update({where:{userId:me.id},data:{balanceCoins:{decrement:BigInt(gift.coins)}}});
   return t.giftTransaction.create({
    data:{
     senderId:me.id,
     recipientId:recipient.id,
     giftKey:gift.key,
     giftName:gift.name,
     coinCost:BigInt(gift.coins),
     dollarValueCents:gift.valueCents,
     creatorShareCents:split.creatorShareCents,
     platformShareCents:split.platformShareCents,
     status:"PENDING"
    }
   });
  },{isolationLevel:"Serializable"});
  await createNotification({
   recipientId:recipient.id,
   actorId:me.id,
   type:"GIFT_RECEIVED",
   targetUrl:"/u/"+recipient.username
  });
  return NextResponse.json({gift:{id:row.id,name:row.giftName},creatorSharePercent:share});
 }catch(e){
  return NextResponse.json({error:e instanceof Error&&e.message==="COINS"?"Not enough coins.":"Gift could not be sent."},{status:409});
 }
}
