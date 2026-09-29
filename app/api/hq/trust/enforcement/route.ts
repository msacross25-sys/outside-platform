import {NextResponse} from "next/server";
import type {ModerationAction} from "@prisma/client";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {isMainOwner,mainOwnerProtectedError} from "@/lib/mainOwnerProtection";

const ENFORCEMENT_ACTIONS=["WARN","RESTRICT","SUSPEND","BAN"] as const;

async function operator(id:string){
 const s=await db.staffProfile.findUnique({where:{userId:id}});
 return !!s?.active&&["OWNER","CO_OWNER","EXECUTIVE_ADMIN","TRUST_SAFETY"].includes(s.role);
}

export async function POST(request:Request){
 const me=await currentUser();
 if(!me||!await operator(me.id))return NextResponse.json({error:"Enforcement permission required."},{status:403});
 const b=await request.json().catch(()=>null);
 const targetUserId=String(b?.targetUserId??"");
 const actionRaw=String(b?.action??"");
 const reason=String(b?.reason??"").trim();
 if(await isMainOwner(targetUserId))return NextResponse.json(mainOwnerProtectedError(),{status:403});
 if(!ENFORCEMENT_ACTIONS.includes(actionRaw as typeof ENFORCEMENT_ACTIONS[number])||reason.length<5)return NextResponse.json({error:"Valid enforcement action and reason required."},{status:400});
 const action=actionRaw as ModerationAction;
 const status=action==="BAN"?"BANNED":action==="SUSPEND"?"SUSPENDED":undefined;
 const result=await db.$transaction(async tx=>{
  if(status)await tx.user.update({where:{id:targetUserId},data:{status}});
  const log=await tx.moderationActionLog.create({data:{actorId:me.id,targetUserId,action,reason}});
  await tx.auditLog.create({data:{actorId:me.id,action:"ACCOUNT_"+action,resourceType:"USER",resourceId:targetUserId,reason}});
  return log;
 });
 return NextResponse.json({enforcement:result});
}
