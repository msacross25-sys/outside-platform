import {NextResponse} from "next/server";
import type {PayoutStatus} from "@prisma/client";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {financeStaff,payoutLedgerDelta,validPayoutTransition} from "@/lib/finance";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const me=await currentUser();
 if(!me||!await financeStaff(me.id))return NextResponse.json({error:"Finance permission required."},{status:403});
 const body=await request.json().catch(()=>null);
 const status=String(body?.status??"");
 const reason=String(body?.reason??"").trim().slice(0,500);
 if(!reason)return NextResponse.json({error:"A finance audit reason is required."},{status:400});

 const payout=await db.creatorPayout.findUnique({where:{id}});
 if(!payout)return NextResponse.json({error:"Payout not found."},{status:404});
 if(!validPayoutTransition(payout.status,status))return NextResponse.json({error:"Invalid payout transition."},{status:409});

 const nextStatus=status as PayoutStatus;
 const providerId=typeof body?.providerTransactionId==="string"?body.providerTransactionId.slice(0,200):undefined;
 const delta=payoutLedgerDelta(payout.status,nextStatus,payout.amountCents);
 const updated=await db.$transaction(async tx=>{
  const p=await tx.creatorPayout.update({
   where:{id},
   data:{
    status:nextStatus,
    providerTransactionId:providerId??payout.providerTransactionId,
    paidAt:nextStatus==="PAID"?new Date():payout.paidAt
   }
  });
  await tx.payoutLedgerEntry.create({
   data:{
    creatorId:p.creatorId,
    payoutId:p.id,
    kind:"PAYOUT_"+nextStatus,
    amountCents:delta,
    referenceType:"CreatorPayout",
    referenceId:p.id,
    note:reason
   }
  });
  await tx.auditLog.create({data:{actorId:me.id,action:"PAYOUT_"+nextStatus,resourceType:"CreatorPayout",resourceId:id,reason}});
  return p;
 });
 return NextResponse.json({payout:updated});
}
