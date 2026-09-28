import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { MINIMUM_PAYOUT_CENTS } from "@/lib/gifts";
export async function GET(){
 const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const [wallet,earned,pending,lastPayout]=await Promise.all([
  db.coinWallet.findUnique({where:{userId:me.id}}),
  db.giftTransaction.aggregate({where:{recipientId:me.id,status:"SETTLED"},_sum:{creatorShareCents:true}}),
  db.giftTransaction.aggregate({where:{recipientId:me.id,status:"PENDING"},_sum:{creatorShareCents:true}}),
  db.creatorPayout.findFirst({where:{creatorId:me.id,status:{in:["PENDING","PROCESSING"]}},orderBy:{createdAt:"desc"}})
 ]);
 const availableCents=earned._sum.creatorShareCents??0;
 return NextResponse.json({
  coinBalance:(wallet?.balanceCoins??0n).toString(),
  earnings:{availableCents,pendingCents:pending._sum.creatorShareCents??0,totalEarnedCents:availableCents+(pending._sum.creatorShareCents??0),minimumPayoutCents:MINIMUM_PAYOUT_CENTS,payoutEligible:availableCents>=MINIMUM_PAYOUT_CENTS,nextPayout:lastPayout}
 });
}