import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {MINIMUM_PAYOUT_CENTS} from "@/lib/gifts";

export async function POST(){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const [account,payoutAccount]=await Promise.all([
  db.user.findUnique({where:{id:me.id},select:{status:true}}),
  db.creatorPayoutAccount.findUnique({where:{userId:me.id}})
 ]);

 if(account?.status!=="ACTIVE"){
  return NextResponse.json({error:"Payouts are unavailable while the account is not in good standing."},{status:403});
 }
 if(!payoutAccount||payoutAccount.provider!=="stripe"||!payoutAccount.payoutsEnabled||!payoutAccount.detailsSubmitted){
  return NextResponse.json({error:"Complete creator payout onboarding before requesting a payout.",onboardingRequired:true},{status:403});
 }

 const exception=await db.giftTransaction.count({
  where:{
   OR:[{recipientId:me.id},{battleId:{not:null}}],
   status:{in:["CHARGEBACK","ADJUSTED"]},
   createdAt:{gte:new Date(Date.now()-30*86400000)}
  }
 });
 if(exception>0){
  return NextResponse.json({error:"Payout review required because recent financial exceptions exist."},{status:409});
 }

 const [settledGifts,settledBattles,reserved]=await Promise.all([
  db.giftTransaction.aggregate({
   where:{recipientId:me.id,battleId:null,status:"SETTLED"},
   _sum:{creatorShareCents:true}
  }),
  db.battleEarning.aggregate({
   where:{userId:me.id,status:"SETTLED"},
   _sum:{amountCents:true}
  }),
  db.creatorPayout.aggregate({
   where:{creatorId:me.id,status:{in:["PENDING","PROCESSING","PAID"]}},
   _sum:{amountCents:true}
  })
 ]);

 const earned=(settledGifts._sum.creatorShareCents??0)+(settledBattles._sum.amountCents??0);
 const available=Math.max(0,earned-(reserved._sum.amountCents??0));
 if(available<MINIMUM_PAYOUT_CENTS){
  return NextResponse.json({error:"Minimum payout not reached."},{status:409});
 }

 const open=await db.creatorPayout.findFirst({
  where:{creatorId:me.id,status:{in:["PENDING","PROCESSING"]}}
 });
 if(open)return NextResponse.json({payout:open,alreadyQueued:true});

 const now=new Date();
 const epoch=Date.UTC(2026,0,2);
 const cycle=14*86400000;
 const next=epoch+Math.ceil((now.getTime()-epoch)/cycle)*cycle;
 const scheduledFor=new Date(Math.max(next,now.getTime()));

 const payout=await db.$transaction(async tx=>{
  const existing=await tx.creatorPayout.findFirst({
   where:{creatorId:me.id,status:{in:["PENDING","PROCESSING"]}}
  });
  if(existing)return existing;

  const created=await tx.creatorPayout.create({
   data:{creatorId:me.id,amountCents:available,scheduledFor}
  });
  await tx.payoutLedgerEntry.create({
   data:{
    creatorId:me.id,
    payoutId:created.id,
    kind:"PAYOUT_RESERVED",
    amountCents:available,
    referenceType:"CreatorPayout",
    referenceId:created.id
   }
  });
  return created;
 },{isolationLevel:"Serializable"});

 return NextResponse.json({payout});
}
