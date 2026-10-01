import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {canSupport,currentStaff} from "@/lib/hq";

const STATUSES=["OPEN","RESPONDED","RESOLVED"] as const;

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const auth=await currentStaff();
 if(!auth||!canSupport(auth.staff.role))return NextResponse.json({error:"Support staff access required."},{status:403});

 const body=await request.json().catch(()=>null);
 const status=String(body?.status??"RESPONDED").toUpperCase();
 const response=String(body?.response??"").trim().slice(0,3000);
 if(!(STATUSES as readonly string[]).includes(status))return NextResponse.json({error:"Invalid support status."},{status:400});
 if(status!=="OPEN"&&response.length<2)return NextResponse.json({error:"A staff response is required."},{status:400});

 const existing=await db.supportTicket.findUnique({where:{id}});
 if(!existing)return NextResponse.json({error:"Support ticket not found."},{status:404});

 const ticket=await db.$transaction(async tx=>{
  const updated=await tx.supportTicket.update({
   where:{id},
   data:{
    status,
    staffResponse:response||existing.staffResponse,
    respondedAt:response?new Date():existing.respondedAt,
    resolvedAt:status==="RESOLVED"?new Date():null
   }
  });
  await tx.auditLog.create({
   data:{
    actorId:auth.user.id,
    action:"SUPPORT_TICKET_"+status,
    resourceType:"SupportTicket",
    resourceId:id,
    reason:response||"Support status updated"
   }
  });
  return updated;
 });

 return NextResponse.json({ticket});
}
