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

 const earning=await db.battleEarning.findUnique({where:{id}});
 if(!earning)return NextResponse.json({error:"Battle reward earning not found."},{status:404});
 if(earning.giftTransactionId)return NextResponse.json({error:"Gift-funded battle shares must be settled from the gift transaction."},{status:409});
 if(!validGiftTransition(earning.status,status))return NextResponse.json({error:"Invalid reward transition."},{status:409});

 const nextStatus=status as LedgerStatus;
 const delta=giftLedgerDelta(earning.status,nextStatus,earning.amountCents);

 const updated=await db.$transaction(async tx=>{
  const row=await tx.battleEarning.update({
   where:{id},
   data:{
    status:nextStatus,
    settledAt:nextStatus==="SETTLED"?new Date():earning.settledAt
   }
  });

  if(delta!==0){
   await tx.payoutLedgerEntry.create({
    data:{
     creatorId:row.userId,
     kind:"BATTLE_REWARD_"+nextStatus,
     amountCents:delta,
     referenceType:"BattleEarning",
     referenceId:row.id,
     note:reason
    }
   });
  }

  await tx.auditLog.create({
   data:{
    actorId:me.id,
    action:"BATTLE_REWARD_"+nextStatus,
    resourceType:"BattleEarning",
    resourceId:row.id,
    reason
   }
  });

  return row;
 });

 return NextResponse.json({earning:updated});
}
