import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {syncAchievements} from "@/lib/syncAchievements";
import {createNotification} from "@/lib/notifications";
import {
 deleteLivekitRoom,
 ensureLivekitRoom,
 livekitEnabled,
 liveMediaProvider
} from "@/lib/livekit";
import {
 liveRecordingTestMode,
 replayMediaPath,
 startLiveRecording,
 stopLiveRecording
} from "@/lib/liveRecording";
import {
 clearLiveReactionCount,
 readLiveReactionCount,
 resetLiveReactionCount
} from "@/lib/liveScale";

export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const room=await db.porchRoom.findUnique({
  where:{slug},
  include:{members:{where:{userId:me.id},select:{role:true}}}
 });
 if(!room||room.members[0]?.role!=="HOST"){
  return NextResponse.json({error:"Only the host can control room status."},{status:403});
 }

 const body=await request.json().catch(()=>null);
 const action=String(body?.action??"");

 if(action==="START"){
  if(room.status==="LIVE")return NextResponse.json({status:"LIVE"});
  if(room.status==="ENDED"||room.status==="CANCELLED"){
   return NextResponse.json({error:"This room cannot be restarted."},{status:409});
  }

  if(liveMediaProvider()==="livekit"&&!livekitEnabled()){
   return NextResponse.json({error:"Production Live media is not configured."},{status:503});
  }

  try{
   await ensureLivekitRoom(room.id,{
    slug:room.slug,
    title:room.title,
    roomType:room.roomType
   });
  }catch(error){
   console.error("LiveKit room creation failed",error);
   return NextResponse.json({error:"Live media room could not be prepared."},{status:503});
  }

  await db.liveReplay.upsert({
   where:{roomId:room.id},
   create:{
    roomId:room.id,
    hostId:me.id,
    visible:room.replayVisible,
    status:"PENDING"
   },
   update:{
    visible:room.replayVisible,
    status:"PENDING",
    mediaUrl:null,
    downloadUrl:null,
    readyAt:null
   }
  });

  try{
   const recording=await startLiveRecording(room.id,room.roomType);
   if(!recording){
    await db.liveReplay.update({
     where:{roomId:room.id},
     data:{status:"FAILED"}
    });
   }
  }catch(error){
   console.error("Live replay recording could not start",error);
   await db.liveReplay.update({
    where:{roomId:room.id},
    data:{status:"FAILED"}
   });
  }

  const reactionReady=await resetLiveReactionCount(room.id);
  if(!reactionReady){
   try{await deleteLivekitRoom(room.id)}catch{}
   return NextResponse.json({error:"Live scale infrastructure is unavailable."},{status:503});
  }

  const followerBaseline=await db.follow.count({where:{followingId:me.id}});
  const updated=await db.porchRoom.update({
   where:{id:room.id},
   data:{
    status:"LIVE",
    startedAt:new Date(),
    endedAt:null,
    followerBaseline,
    totalViewers:0,
    peakViewers:0,
    reactionCount:0
   },
   select:{status:true,startedAt:true}
  });

  await db.userBadge.upsert({
   where:{userId_key:{userId:me.id,key:"FIRST_LIVE"}},
   create:{userId:me.id,key:"FIRST_LIVE",name:"First Live",icon:"🎥"},
   update:{}
  });

  return NextResponse.json(updated);
 }

 if(action==="END"){
  if(room.status==="ENDED")return NextResponse.json({status:"ENDED"});
  if(room.status!=="LIVE"){
   return NextResponse.json({error:"Only a live room can be ended."},{status:409});
  }

  const updated=await db.porchRoom.update({
   where:{id:room.id},
   data:{status:"ENDED",endedAt:new Date(),screenSharing:false},
   select:{status:true,endedAt:true}
  });

  try{
   await stopLiveRecording(room.id);
  }catch(error){
   console.error("Live replay recording could not stop cleanly",error);
   await db.liveReplay.updateMany({
    where:{roomId:room.id,status:{not:"DELETED"}},
    data:{status:"FAILED",readyAt:null}
   });
  }

  try{
   await deleteLivekitRoom(room.id);
  }catch(error){
   console.error("LiveKit room cleanup failed",error);
  }

  await db.viewingSession.updateMany({
   where:{roomId:room.id,endedAt:null},
   data:{endedAt:new Date()}
  });

  const [followers,gifts,watch,comments,reactionTotalRaw]=await Promise.all([
   db.follow.count({where:{followingId:me.id}}),
   db.giftTransaction.aggregate({
    where:{roomId:room.id,status:"SETTLED"},
    _sum:{dollarValueCents:true,creatorShareCents:true},
    _count:true
   }),
   db.viewingSession.aggregate({
    where:{roomId:room.id,eligible:true},
    _sum:{verifiedSeconds:true}
   }),
   db.liveMessage.count({where:{roomId:room.id}}),
   readLiveReactionCount(room.id)
  ]);
  const reactionTotal=reactionTotalRaw??room.reactionCount;
  await db.porchRoom.update({
   where:{id:room.id},
   data:{reactionCount:reactionTotal}
  });

  const durationSeconds=room.startedAt
   ?Math.max(0,Math.floor((Date.now()-room.startedAt.getTime())/1000))
   :0;

  await db.liveReplay.upsert({
   where:{roomId:room.id},
   create:{
    roomId:room.id,
    hostId:me.id,
    visible:room.replayVisible,
    durationSeconds,
    totalViewers:room.totalViewers,
    peakViewers:room.peakViewers,
    verifiedWatchSeconds:watch._sum.verifiedSeconds??0,
    followersGained:Math.max(0,followers-room.followerBaseline),
    reactionCount:reactionTotal,
    commentCount:comments,
    giftCount:gifts._count,
    giftValueCents:gifts._sum.dollarValueCents??0,
    creatorEarningsCents:gifts._sum.creatorShareCents??0
   },
   update:{
    visible:room.replayVisible,
    durationSeconds,
    totalViewers:room.totalViewers,
    peakViewers:room.peakViewers,
    verifiedWatchSeconds:watch._sum.verifiedSeconds??0,
    followersGained:Math.max(0,followers-room.followerBaseline),
    reactionCount:reactionTotal,
    commentCount:comments,
    giftCount:gifts._count,
    giftValueCents:gifts._sum.dollarValueCents??0,
    creatorEarningsCents:gifts._sum.creatorShareCents??0
   }
  });

  if(liveRecordingTestMode()){
   const mediaUrl=replayMediaPath(room.slug);
   await db.liveReplay.update({
    where:{roomId:room.id},
    data:{
     status:"READY",
     readyAt:new Date(),
     mediaUrl,
     downloadUrl:mediaUrl+"?download=1"
    }
   });
   await createNotification({
    recipientId:me.id,
    actorId:me.id,
    type:"REPLAY_READY",
    targetUrl:"/porch/"+room.slug
   });
  }

  await db.liveSignal.deleteMany({where:{roomId:room.id}});
  await db.liveViewerPresence.updateMany({
   where:{roomId:room.id,active:true},
   data:{active:false,lastSeenAt:new Date()}
  });
  await clearLiveReactionCount(room.id);
  await syncAchievements(me.id);

  return NextResponse.json(updated);
 }

 if(action==="CANCEL"){
  if(room.status==="LIVE"||room.status==="ENDED"){
   return NextResponse.json({error:"A live or ended room cannot be cancelled."},{status:409});
  }
  const updated=await db.porchRoom.update({
   where:{id:room.id},
   data:{status:"CANCELLED"},
   select:{status:true}
  });
  return NextResponse.json(updated);
 }

 return NextResponse.json({error:"Action must be START, END, or CANCEL."},{status:400});
}
