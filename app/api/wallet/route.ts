import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { MINIMUM_PAYOUT_CENTS } from "@/lib/gifts";
export async function GET(){
 const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const [wallet,settled,pending,payouts,nextPayout]=await Promise.all([
  db.coinWallet.findUnique({where:{userId:me.id}}),
  db.giftTransaction.aggregate({where:{recipientId:me.id,status:"SETTLED"},_sum:{creatorShareCents:true}}),
  db.giftTransaction.aggregate({where:{recipientId:me.id,status:"PENDING"},_sum:{creatorShareCents:true}}),
  db.creatorPayout.aggregate({where:{creatorId:me.id,status:{in:["PENDING","PROCESSING","PAID"]}},_sum:{amountCents:true}}),
  db.creatorPayout.findFirst({where:{creatorId:me.id,status:{in:["PENDING","PROCESSING"]}},orderBy:{createdAt:"desc"}})
 ]);
 const settledCents=settled._sum.creatorShareCents??0,pendingCents=pending._sum.creatorShareCents??0,reservedOrPaidCents=payouts._sum.amountCents??0;
 const availableCents=Math.max(0,settledCents-reservedOrPaidCents);
 return NextResponse.json({coinBalance:(wallet?.balanceCoins??0n).toString(),earnings:{availableCents,pendingCents,totalEarnedCents:settledCents+pendingCents,paidOrReservedCents:reservedOrPaidCents,minimumPayoutCents:MINIMUM_PAYOUT_CENTS,payoutEligible:availableCents>=MINIMUM_PAYOUT_CENTS,nextPayout}});
}