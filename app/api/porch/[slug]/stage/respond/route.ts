import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {getLiveMemberAccess} from "@/lib/porchAccess";
import {syncLivekitParticipantRole} from "@/lib/livekit";

export async function PATCH(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const access=await getLiveMemberAccess(slug,me.id);
 if(!access)return NextResponse.json({error:"Live room access required."},{status:403});
 const body=await request.json().catch(()=>null),action=String(body?.action??"");
 const req=await db.porchStageRequest.findUnique({where:{roomId_userId:{roomId:access.room.id,userId:me.id}}});
 if(!req)return NextResponse.json({error:"Stage request not found."},{status:404});
 if(action==="CANCEL"){
  await db.porchStageRequest.update({where:{roomId_userId:{roomId:access.room.id,userId:me.id}},data:{status:"CANCELLED",reviewedAt:new Date()}});
  return NextResponse.json({status:"CANCELLED"});
 }
 if(action==="DECLINE"){
  if(req.status!=="INVITED")return NextResponse.json({error:"No invitation is waiting."},{status:409});
  await db.porchStageRequest.update({where:{roomId_userId:{roomId:access.room.id,userId:me.id}},data:{status:"DECLINED",reviewedAt:new Date()}});
  return NextResponse.json({status:"DECLINED"});
 }
 if(action!=="ACCEPT"||req.status!=="INVITED")return NextResponse.json({error:"No invitation is waiting."},{status:409});
 const result=await db.$transaction(async tx=>{
  const count=await tx.porchMember.count({where:{roomId:access.room.id,role:{in:["HOST","COHOST","SPEAKER"]}}});
  if(count>=access.room.stageSize)return false;
  await tx.porchMember.update({where:{roomId_userId:{roomId:access.room.id,userId:me.id}},data:{role:"SPEAKER"}});
  await tx.porchStageRequest.update({where:{roomId_userId:{roomId:access.room.id,userId:me.id}},data:{status:"APPROVED",reviewedAt:new Date()}});
  return true;
 },{isolationLevel:"Serializable"});
 if(!result)return NextResponse.json({error:"Stage is full."},{status:409});
 try{
  await syncLivekitParticipantRole(access.room.id,me.id,"SPEAKER");
 }catch(error){
  console.error("LiveKit speaker permission sync failed",error);
 }
 return NextResponse.json({role:"SPEAKER"});
}
