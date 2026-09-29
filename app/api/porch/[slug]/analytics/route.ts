import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {getPorchAccess} from "@/lib/porchAccess";

export async function GET(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const access=await getPorchAccess(slug,me.id);
 if(!access.room||!access.allowed)return NextResponse.json({error:"Room not found."},{status:404});
 const room=access.room,hostId=access.host?.userId;
 if(!hostId)return NextResponse.json({error:"Host not found."},{status:404});
 const cutoff=new Date(Date.now()-45000);
 const [currentViewers,followers,giftActivity,settledGifts,watch,messageCount]=await Promise.all([
  db.liveViewerPresence.count({where:{roomId:room.id,active:true,lastSeenAt:{gte:cutoff}}}),
  db.follow.count({where:{followingId:hostId}}),
  db.giftTransaction.count({where:{roomId:room.id,status:{in:["PENDING","SETTLED"]}}}),
  db.giftTransaction.aggregate({where:{roomId:room.id,status:"SETTLED"},_sum:{coinCost:true,dollarValueCents:true,creatorShareCents:true},_count:true}),
  db.viewingSession.aggregate({where:{roomId:room.id,eligible:true},_sum:{verifiedSeconds:true}}),
  db.liveMessage.count({where:{roomId:room.id}})
 ]);
 const owner=me.id===hostId;
 const durationSeconds=room.startedAt?Math.max(0,Math.floor(((room.endedAt??new Date()).getTime()-room.startedAt.getTime())/1000)):0;
 return NextResponse.json({
  status:room.status,durationSeconds,currentViewers,totalViewers:room.totalViewers,peakViewers:room.peakViewers,
  followersGained:Math.max(0,followers-room.followerBaseline),reactionCount:room.reactionCount,messageCount,
  verifiedWatchSeconds:owner?(watch._sum.verifiedSeconds??0):undefined,
  gifts:{
   count:giftActivity,
   settledCount:owner?settledGifts._count:undefined,
   coins:owner?Number(settledGifts._sum.coinCost??0):undefined,
   valueCents:owner?(settledGifts._sum.dollarValueCents??0):undefined,
   creatorEarningsCents:owner?(settledGifts._sum.creatorShareCents??0):undefined
  }
 });
}
