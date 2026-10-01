import {randomBytes} from "node:crypto";
import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";

async function ensureCode(userId:string){
 const existing=await db.referralCode.findUnique({where:{ownerId:userId}});
 if(existing)return existing;

 for(let attempt=0;attempt<5;attempt++){
  const code="OUT-"+randomBytes(4).toString("hex").toUpperCase();
  try{
   return await db.referralCode.create({data:{ownerId:userId,code}});
  }catch(error){
   if(attempt===4)throw error;
  }
 }
 throw new Error("REFERRAL_CODE_UNAVAILABLE");
}

export async function GET(){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const [code,attribution,referralCount,earnings]=await Promise.all([
  ensureCode(me.id),
  db.referralAttribution.findUnique({
   where:{referredUserId:me.id},
   include:{referrer:{select:{username:true,displayName:true}}}
  }),
  db.referralAttribution.count({where:{referrerId:me.id}}),
  db.battleEarning.aggregate({
   where:{userId:me.id,kind:"BATTLE_REFERRAL_REWARD"},
   _sum:{amountCents:true}
  })
 ]);

 return NextResponse.json({
  code:code.code,
  referredBy:attribution?.referrer??null,
  referrals:referralCount,
  referralEarningsCents:earnings._sum.amountCents??0
 });
}

export async function POST(request:Request){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const body=await request.json().catch(()=>null);
 const code=String(body?.code??"").trim().toUpperCase().slice(0,32);
 if(!code)return NextResponse.json({error:"Referral code is required."},{status:400});

 const existing=await db.referralAttribution.findUnique({where:{referredUserId:me.id}});
 if(existing)return NextResponse.json({error:"A referral has already been attached to this account."},{status:409});

 const [giftCount,paidPurchases,target]=await Promise.all([
  db.giftTransaction.count({where:{senderId:me.id}}),
  db.coinPurchase.count({where:{userId:me.id,status:"PAID"}}),
  db.referralCode.findUnique({
   where:{code},
   include:{owner:{select:{id:true,status:true,username:true,displayName:true}}}
  })
 ]);

 if(giftCount>0||paidPurchases>0){
  return NextResponse.json({error:"Referral codes must be applied before coin purchases or gifting begins."},{status:409});
 }
 if(!target||target.owner.status!=="ACTIVE")return NextResponse.json({error:"Referral code not found."},{status:404});
 if(target.ownerId===me.id)return NextResponse.json({error:"You cannot refer yourself."},{status:400});

 await db.referralAttribution.create({
  data:{referredUserId:me.id,referrerId:target.ownerId}
 });

 return NextResponse.json({
  referrer:{username:target.owner.username,displayName:target.owner.displayName}
 });
}
