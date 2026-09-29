import {NextResponse} from "next/server";
import type {LedgerStatus} from "@prisma/client";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {financeStaff,giftLedgerDelta,validGiftTransition} from "@/lib/finance";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const me=await currentUser();
 if(!me||!await financeStaff(me.id))return NextResponse.json({error:"Finance permission required."},{status:403});
 const body=await request.json().catch(()=>null);
 const status=String(body?.status??"");
 const reason=String(body?.reason??"").trim().slice(0,500);
 if(!reason)return NextResponse.json({error:"A finance audit reason is required."},{status:400});

 const gift=await db.giftTransaction.findUnique({where:{id}});
 if(!gift)return NextResponse.json({error:"Gift transaction not found."},{status:404});
 if(!validGiftTransition(gift.status,status))return NextResponse.json({error:"Invalid ledger transition."},{status:409});

 const nextStatus=status as LedgerStatus;
 const delta=giftLedgerDelta(gift.status,nextStatus,gift.creatorShareCents);
 const updated=await db.$transaction(async tx=>{
  const row=await tx.giftTransaction.update({
   where:{id},
   data:{
    status:nextStatus,
    settledAt:nextStatus==="SETTLED"?new Date():gift.settledAt,
    refundStatus:nextStatus==="REFUNDED"?"REFUNDED":nextStatus==="CHARGEBACK"?"CHARGEBACK":gift.refundStatus
   }
  });
  await tx.payoutLedgerEntry.create({
   data:{
    creatorId:row.recipientId,
    kind:"GIFT_"+nextStatus,
    amountCents:delta,
    referenceType:"GiftTransaction",
    referenceId:row.id,
    note:reason
   }
  });
  await tx.auditLog.create({data:{actorId:me.id,action:"GIFT_LEDGER_"+nextStatus,resourceType:"GiftTransaction",resourceId:id,reason}});
  return row;
 });
 return NextResponse.json({transaction:updated});
}
