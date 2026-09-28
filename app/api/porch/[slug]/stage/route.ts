import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

async function context(slug:string,userId:string){
 const room=await db.porchRoom.findUnique({where:{slug},include:{members:{select:{userId:true,role:true}}}});
 if(!room)return null;
 return {room,member:room.members.find(m=>m.userId===userId),host:room.members.find(m=>m.role==="HOST")};
}
export async function GET(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const x=await context(slug,me.id);if(!x)return NextResponse.json({error:"Room not found."},{status:404});
 const isHost=x.member?.role==="HOST";
 const requests=await db.porchStageRequest.findMany({where:{roomId:x.room.id,...(isHost?{}:{userId:me.id})},orderBy:{requestedAt:"asc"},include:{user:{select:{username:true,displayName:true}},}});
 return NextResponse.json({requests});
}
export async function POST(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const x=await context(slug,me.id);if(!x||x.room.status!=="LIVE")return NextResponse.json({error:"Live room unavailable."},{status:404});
 if(!x.member)return NextResponse.json({error:"Join the room first."},{status:403});
 if(!x.room.guestRequestsEnabled)return NextResponse.json({error:"Guest requests are turned off for this live."},{status:403});
 if(x.member.role!=="LISTENER")return NextResponse.json({error:"Your current room role cannot request the stage."},{status:409});
 const request=await db.porchStageRequest.upsert({where:{roomId_userId:{roomId:x.room.id,userId:me.id}},create:{roomId:x.room.id,userId:me.id},update:{status:"PENDING",requestedAt:new Date(),reviewedAt:null}});
 return NextResponse.json({request},{status:201});
}
export async function PATCH(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const body=await request.json().catch(()=>null);const userId=String(body?.userId??"");const action=String(body?.action??"");
 const x=await context(slug,me.id);if(!x||x.member?.role!=="HOST")return NextResponse.json({error:"Only the host can manage the stage."},{status:403});
 const target=x.room.members.find(m=>m.userId===userId);if(!target||target.role==="HOST")return NextResponse.json({error:"Room member not found."},{status:404});
 if(action==="REMOVE"){
  await db.$transaction([db.porchMember.update({where:{roomId_userId:{roomId:x.room.id,userId}},data:{role:"LISTENER"}}),db.porchStageRequest.updateMany({where:{roomId:x.room.id,userId},data:{status:"DECLINED",reviewedAt:new Date()}})]);
  return NextResponse.json({role:"LISTENER"});
 }
 if(!["APPROVE","INVITE","DECLINE"].includes(action))return NextResponse.json({error:"Invalid stage action."},{status:400});
 if(action==="INVITE"){await db.porchStageRequest.upsert({where:{roomId_userId:{roomId:x.room.id,userId}},create:{roomId:x.room.id,userId,status:"INVITED",reviewedAt:new Date()},update:{status:"INVITED",reviewedAt:new Date()}});return NextResponse.json({status:"INVITED"});}
 if(action==="DECLINE"){await db.porchStageRequest.updateMany({where:{roomId:x.room.id,userId},data:{status:"DECLINED",reviewedAt:new Date()}});return NextResponse.json({status:"DECLINED"});}
 if(action==="INVITE")return NextResponse.json({status:"INVITED"});
 const stageCount=x.room.members.filter(m=>["HOST","COHOST","SPEAKER"].includes(m.role)).length;
 if(stageCount>=x.room.stageSize)return NextResponse.json({error:`Stage is full (${x.room.stageSize} max).`},{status:409});
 await db.$transaction([db.porchMember.update({where:{roomId_userId:{roomId:x.room.id,userId}},data:{role:"SPEAKER"}}),db.porchStageRequest.upsert({where:{roomId_userId:{roomId:x.room.id,userId}},create:{roomId:x.room.id,userId,status:"APPROVED",reviewedAt:new Date()},update:{status:"APPROVED",reviewedAt:new Date()}})]);
 return NextResponse.json({role:"SPEAKER"});
}