import {NextResponse} from "next/server";
import {WebhookReceiver} from "livekit-server-sdk";
import {db} from "@/lib/db";
import {livekitCredentials,roomIdFromLivekitRoomName} from "@/lib/livekit";
import {replayMediaPath} from "@/lib/liveRecording";

export const dynamic="force-dynamic";

export async function POST(request:Request){
 let receiver:WebhookReceiver;
 try{
  const {apiKey,apiSecret}=livekitCredentials();
  receiver=new WebhookReceiver(apiKey,apiSecret);
 }catch{
  return NextResponse.json({error:"Webhook receiver is not configured."},{status:503});
 }

 const authorization=request.headers.get("authorization")??undefined;
 if(!authorization)return NextResponse.json({error:"Unauthorized."},{status:401});

 let event;
 try{
  const raw=await request.text();
  event=await receiver.receive(raw,authorization);
 }catch(error){
  console.error("LiveKit webhook verification failed",error);
  return NextResponse.json({error:"Unauthorized."},{status:401});
 }

 if(event.event!=="egress_ended"){
  return NextResponse.json({ok:true});
 }

 const info=(event as any).egressInfo;
 const roomId=roomIdFromLivekitRoomName(String(info?.roomName??""));
 if(!roomId)return NextResponse.json({ok:true});

 const replay=await db.liveReplay.findUnique({
  where:{roomId},
  include:{room:{select:{slug:true}}}
 });
 if(!replay||replay.status==="DELETED")return NextResponse.json({ok:true});

 const fileResults=Array.isArray(info?.fileResults)?info.fileResults:[];
 const complete=Number(info?.status)===3&&fileResults.length>0&&!info?.error;

 if(!complete){
  await db.liveReplay.update({
   where:{roomId},
   data:{status:"FAILED",readyAt:null,mediaUrl:null,downloadUrl:null}
  });
  return NextResponse.json({ok:true,status:"FAILED"});
 }

 const mediaUrl=replayMediaPath(replay.room.slug);
 const wasReady=replay.status==="READY";

 await db.liveReplay.update({
  where:{roomId},
  data:{
   status:"READY",
   readyAt:new Date(),
   mediaUrl,
   downloadUrl:mediaUrl+"?download=1"
  }
 });

 if(!wasReady){
  await db.notification.create({
   data:{
    recipientId:replay.hostId,
    actorId:replay.hostId,
    type:"REPLAY_READY"
   }
  });
 }

 return NextResponse.json({ok:true,status:"READY"});
}
