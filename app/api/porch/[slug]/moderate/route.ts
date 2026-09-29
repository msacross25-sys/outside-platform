import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";

async function access(slug:string,userId:string){
 const room=await db.porchRoom.findUnique({where:{slug},include:{members:{where:{userId},select:{role:true}}}});
 const role=room?.members[0]?.role;
 if(!room||!role||!["HOST","MODERATOR"].includes(role))return null;
 return {room,role};
}

export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const a=await access(slug,me.id);
 if(!a)return NextResponse.json({error:"Room moderation access required."},{status:403});

 const b=await request.json().catch(()=>null);
 const userId=String(b?.userId??"");
 const action=String(b?.action??"");
 if(!userId||userId===me.id||!["MUTE","UNMUTE","KICK","BAN","REPORT"].includes(action)){
  return NextResponse.json({error:"Valid participant and action required."},{status:400});
 }
 if(action==="BAN"&&a.role!=="HOST"){
  return NextResponse.json({error:"Only the host can ban a participant from this room."},{status:403});
 }

 const target=await db.porchMember.findUnique({where:{roomId_userId:{roomId:a.room.id,userId}},select:{role:true}});
 if(!target)return NextResponse.json({error:"Room participant not found."},{status:404});
 if(target.role==="HOST"||(a.role==="MODERATOR"&&["COHOST","MODERATOR"].includes(target.role))){
  return NextResponse.json({error:"You cannot use this room action on that participant."},{status:403});
 }

 if(action==="REPORT"){
  await db.report.create({data:{reporterId:me.id,reportedUserId:userId,reason:"OTHER",details:"Reported from Live room "+slug}});
  return NextResponse.json({reported:true});
 }

 if(action==="KICK"){
  await db.$transaction([
   db.porchMember.deleteMany({where:{roomId:a.room.id,userId}}),
   db.porchStageRequest.deleteMany({where:{roomId:a.room.id,userId}}),
   db.liveViewerPresence.updateMany({where:{roomId:a.room.id,userId},data:{active:false,lastSeenAt:new Date()}}),
   db.liveSignal.deleteMany({where:{roomId:a.room.id,OR:[{senderId:userId},{targetUserId:userId}]}})
  ]);
  return NextResponse.json({kicked:true});
 }

 if(action==="BAN"){
  await db.$transaction([
   db.porchRoomRestriction.upsert({
    where:{roomId_userId:{roomId:a.room.id,userId}},
    create:{roomId:a.room.id,userId,muted:true,banned:true},
    update:{muted:true,banned:true}
   }),
   db.porchMember.deleteMany({where:{roomId:a.room.id,userId}}),
   db.porchStageRequest.deleteMany({where:{roomId:a.room.id,userId}}),
   db.liveViewerPresence.updateMany({where:{roomId:a.room.id,userId},data:{active:false,lastSeenAt:new Date()}}),
   db.liveSignal.deleteMany({where:{roomId:a.room.id,OR:[{senderId:userId},{targetUserId:userId}]}})
  ]);
  return NextResponse.json({banned:true});
 }

 const restriction=await db.porchRoomRestriction.upsert({
  where:{roomId_userId:{roomId:a.room.id,userId}},
  create:{roomId:a.room.id,userId,muted:action==="MUTE"},
  update:{muted:action==="MUTE"}
 });
 return NextResponse.json({restriction});
}
