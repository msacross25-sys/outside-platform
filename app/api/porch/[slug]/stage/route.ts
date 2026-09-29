import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {getLiveMemberAccess} from "@/lib/porchAccess";

export async function GET(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const access=await getLiveMemberAccess(slug,me.id);
 if(!access)return NextResponse.json({error:"Live room access required."},{status:403});
 const isHost=access.member?.role==="HOST";
 const requests=await db.porchStageRequest.findMany({where:{roomId:access.room.id,...(isHost?{}:{userId:me.id})},orderBy:{requestedAt:"asc"},include:{user:{select:{username:true,displayName:true}}}});
 return NextResponse.json({requests});
}

export async function POST(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const access=await getLiveMemberAccess(slug,me.id);
 if(!access)return NextResponse.json({error:"Live room access required."},{status:403});
 if(!access.room.guestRequestsEnabled)return NextResponse.json({error:"Guest requests are turned off for this live."},{status:403});
 if(access.member?.role!=="LISTENER")return NextResponse.json({error:"Your current room role cannot request the stage."},{status:409});
 const request=await db.porchStageRequest.upsert({where:{roomId_userId:{roomId:access.room.id,userId:me.id}},create:{roomId:access.room.id,userId:me.id},update:{status:"PENDING",requestedAt:new Date(),reviewedAt:null}});
 return NextResponse.json({request},{status:201});
}

export async function PATCH(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const access=await getLiveMemberAccess(slug,me.id);
 if(!access||access.member?.role!=="HOST")return NextResponse.json({error:"Only the host can manage the stage."},{status:403});
 const body=await request.json().catch(()=>null),userId=String(body?.userId??""),action=String(body?.action??"");
 const target=access.room.members.find(m=>m.userId===userId);
 if(!target||target.role==="HOST"||target.role==="MODERATOR")return NextResponse.json({error:"Room member is not eligible for this stage action."},{status:404});
 const targetRestriction=await db.porchRoomRestriction.findUnique({where:{roomId_userId:{roomId:access.room.id,userId}},select:{banned:true}});
 if(targetRestriction?.banned)return NextResponse.json({error:"That participant is unavailable."},{status:409});
 if(action==="REMOVE"){
  await db.$transaction([
   db.porchMember.update({where:{roomId_userId:{roomId:access.room.id,userId}},data:{role:"LISTENER"}}),
   db.porchStageRequest.updateMany({where:{roomId:access.room.id,userId},data:{status:"DECLINED",reviewedAt:new Date()}})
  ]);
  return NextResponse.json({role:"LISTENER"});
 }
 if(!["APPROVE","INVITE","DECLINE"].includes(action))return NextResponse.json({error:"Invalid stage action."},{status:400});
 if(action==="INVITE"){
  await db.porchStageRequest.upsert({where:{roomId_userId:{roomId:access.room.id,userId}},create:{roomId:access.room.id,userId,status:"INVITED",reviewedAt:new Date()},update:{status:"INVITED",reviewedAt:new Date()}});
  return NextResponse.json({status:"INVITED"});
 }
 if(action==="DECLINE"){
  await db.porchStageRequest.updateMany({where:{roomId:access.room.id,userId},data:{status:"DECLINED",reviewedAt:new Date()}});
  return NextResponse.json({status:"DECLINED"});
 }
 const claimed=await db.$transaction(async tx=>{
  const count=await tx.porchMember.count({where:{roomId:access.room.id,role:{in:["HOST","COHOST","SPEAKER"]}}});
  if(count>=access.room.stageSize)return false;
  await tx.porchMember.update({where:{roomId_userId:{roomId:access.room.id,userId}},data:{role:"SPEAKER"}});
  await tx.porchStageRequest.upsert({where:{roomId_userId:{roomId:access.room.id,userId}},create:{roomId:access.room.id,userId,status:"APPROVED",reviewedAt:new Date()},update:{status:"APPROVED",reviewedAt:new Date()}});
  return true;
 },{isolationLevel:"Serializable"});
 if(!claimed)return NextResponse.json({error:"Stage is full."},{status:409});
 return NextResponse.json({role:"SPEAKER"});
}
