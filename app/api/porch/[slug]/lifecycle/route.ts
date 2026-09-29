import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { syncAchievements } from "@/lib/syncAchievements";
export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const room=await db.porchRoom.findUnique({where:{slug},include:{members:{where:{userId:me.id},select:{role:true}}}});
 if(!room||room.members[0]?.role!=="HOST")return NextResponse.json({error:"Only the host can control room status."},{status:403});
 const body=await request.json().catch(()=>null);const action=String(body?.action??"");
 if(action==="START"){
  if(room.status==="LIVE")return NextResponse.json({status:"LIVE"});
  if(room.status==="ENDED"||room.status==="CANCELLED")return NextResponse.json({error:"This room cannot be restarted."},{status:409});
  const followerBaseline=await db.follow.count({where:{followingId:me.id}});const updated=await db.porchRoom.update({where:{id:room.id},data:{status:"LIVE",startedAt:new Date(),endedAt:null,followerBaseline,totalViewers:0,peakViewers:0,reactionCount:0},select:{status:true,startedAt:true}});
  await db.userBadge.upsert({where:{userId_key:{userId:me.id,key:"FIRST_LIVE"}},create:{userId:me.id,key:"FIRST_LIVE",name:"First Live",icon:"🎥"},update:{}});
  const followers=await db.follow.findMany({where:{followingId:me.id},select:{followerId:true}});if(followers.length)await db.notification.createMany({data:followers.map(f=>({recipientId:f.followerId,actorId:me.id,type:"LIVE_STARTED"})),skipDuplicates:false});
  return NextResponse.json(updated);
 }
 if(action==="END"){
  if(room.status==="ENDED")return NextResponse.json({status:"ENDED"});
  if(room.status!=="LIVE")return NextResponse.json({error:"Only a live room can be ended."},{status:409});
  const updated=await db.porchRoom.update({where:{id:room.id},data:{status:"ENDED",endedAt:new Date(),screenSharing:false},select:{status:true,endedAt:true}});
  await db.viewingSession.updateMany({where:{roomId:room.id,endedAt:null},data:{endedAt:new Date()}});const [followers,gifts,watch,comments]=await Promise.all([db.follow.count({where:{followingId:me.id}}),db.giftTransaction.aggregate({where:{roomId:room.id,status:{in:["PENDING","SETTLED"]}},_sum:{dollarValueCents:true,creatorShareCents:true},_count:true}),db.viewingSession.aggregate({where:{roomId:room.id,eligible:true},_sum:{verifiedSeconds:true}}),db.liveMessage.count({where:{roomId:room.id}})]);const durationSeconds=room.startedAt?Math.max(0,Math.floor((Date.now()-room.startedAt.getTime())/1000)):0;await db.liveReplay.upsert({where:{roomId:room.id},create:{roomId:room.id,hostId:me.id,visible:room.replayVisible,durationSeconds,totalViewers:room.totalViewers,peakViewers:room.peakViewers,verifiedWatchSeconds:watch._sum.verifiedSeconds??0,followersGained:Math.max(0,followers-room.followerBaseline),reactionCount:room.reactionCount,commentCount:comments,giftCount:gifts._count,giftValueCents:gifts._sum.dollarValueCents??0,creatorEarningsCents:gifts._sum.creatorShareCents??0},update:{visible:room.replayVisible,durationSeconds,totalViewers:room.totalViewers,peakViewers:room.peakViewers,verifiedWatchSeconds:watch._sum.verifiedSeconds??0,followersGained:Math.max(0,followers-room.followerBaseline),reactionCount:room.reactionCount,commentCount:comments,giftCount:gifts._count,giftValueCents:gifts._sum.dollarValueCents??0,creatorEarningsCents:gifts._sum.creatorShareCents??0}});await db.liveSignal.deleteMany({where:{roomId:room.id}});await db.liveViewerPresence.updateMany({where:{roomId:room.id,active:true},data:{active:false,lastSeenAt:new Date()}});await syncAchievements(me.id);
  return NextResponse.json(updated);
 }
 if(action==="CANCEL"){
  if(room.status==="LIVE"||room.status==="ENDED")return NextResponse.json({error:"A live or ended room cannot be cancelled."},{status:409});
  const updated=await db.porchRoom.update({where:{id:room.id},data:{status:"CANCELLED"},select:{status:true}});
  return NextResponse.json(updated);
 }
 return NextResponse.json({error:"Action must be START, END, or CANCEL."},{status:400});
}