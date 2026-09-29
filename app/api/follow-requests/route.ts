import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";

export async function GET(){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const requests=await db.followRequest.findMany({
  where:{targetId:me.id,status:"PENDING",requester:{status:"ACTIVE"}},
  orderBy:{createdAt:"desc"},
  include:{requester:{select:{username:true,displayName:true,avatarUrl:true}}}
 });
 return NextResponse.json({requests});
}

export async function PATCH(request:Request){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const b=await request.json().catch(()=>null);
 const id=String(b?.id??""),decision=String(b?.decision??"");
 if(!["APPROVE","DECLINE"].includes(decision))return NextResponse.json({error:"Valid decision required."},{status:400});

 const req=await db.followRequest.findFirst({where:{id,targetId:me.id,status:"PENDING"},include:{requester:{select:{status:true}}}});
 if(!req)return NextResponse.json({error:"Request not found."},{status:404});
 if(req.requester.status!=="ACTIVE"){
  await db.followRequest.update({where:{id},data:{status:"CANCELLED",reviewedAt:new Date()}});
  return NextResponse.json({error:"Request is no longer available."},{status:409});
 }

 const blocked=await db.block.count({where:{OR:[{blockerId:me.id,blockedId:req.requesterId},{blockerId:req.requesterId,blockedId:me.id}]}});
 if(blocked){
  await db.followRequest.update({where:{id},data:{status:"CANCELLED",reviewedAt:new Date()}});
  return NextResponse.json({error:"Request is no longer available."},{status:409});
 }

 await db.$transaction(async tx=>{
  if(decision==="APPROVE"){
   await tx.follow.upsert({where:{followerId_followingId:{followerId:req.requesterId,followingId:me.id}},create:{followerId:req.requesterId,followingId:me.id},update:{}});
  }
  await tx.followRequest.update({where:{id},data:{status:decision==="APPROVE"?"APPROVED":"DECLINED",reviewedAt:new Date()}});
 });
 return NextResponse.json({approved:decision==="APPROVE"});
}
