import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";

export async function GET(){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const [purchases,gifts,payouts]=await Promise.all([
  db.coinPurchase.findMany({
   where:{userId:me.id},
   orderBy:{createdAt:"desc"},
   take:50,
   select:{
    id:true,
    amountCents:true,
    currency:true,
    coins:true,
    refundedCents:true,
    reversedCoins:true,
    status:true,
    createdAt:true,
    paidAt:true,
    refundedAt:true
   }
  }),
  db.giftTransaction.findMany({
   where:{recipientId:me.id},
   orderBy:{createdAt:"desc"},
   take:50,
   select:{id:true,giftName:true,creatorShareCents:true,status:true,createdAt:true,refundStatus:true}
  }),
  db.creatorPayout.findMany({
   where:{creatorId:me.id},
   orderBy:{createdAt:"desc"},
   take:25,
   select:{id:true,amountCents:true,status:true,scheduledFor:true,paidAt:true,createdAt:true,providerTransactionId:true}
  })
 ]);

 return NextResponse.json({
  purchases:purchases.map(row=>({...row,coins:row.coins.toString(),reversedCoins:row.reversedCoins.toString()})),
  gifts,
  payouts
 });
}
