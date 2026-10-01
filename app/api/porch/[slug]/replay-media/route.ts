import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {createSignedMediaDownload} from "@/lib/mediaStorage";
import {replayObjectKey} from "@/lib/liveRecording";

export const dynamic="force-dynamic";

export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();

 const room=await db.porchRoom.findUnique({
  where:{slug},
  include:{
   replay:true,
   members:{where:{role:"HOST"},select:{userId:true}}
  }
 });

 if(!room?.replay)return NextResponse.json({error:"Replay unavailable."},{status:404});

 const hostId=room.members[0]?.userId??null;
 const owner=Boolean(me&&hostId===me.id);

 if(room.replay.status!=="READY"){
  return NextResponse.json({error:"Replay unavailable."},{status:404});
 }
 if(!room.replay.visible&&!owner){
  return NextResponse.json({error:"Replay unavailable."},{status:404});
 }
 if(!owner&&room.visibility==="PRIVATE"){
  return NextResponse.json({error:"Replay unavailable."},{status:404});
 }
 if(!owner&&room.visibility==="FOLLOWERS"){
  if(!me)return NextResponse.json({error:"Replay unavailable."},{status:404});
  const follows=hostId?await db.follow.findUnique({
   where:{followerId_followingId:{followerId:me.id,followingId:hostId}},
   select:{followerId:true}
  }):null;
  if(!follows)return NextResponse.json({error:"Replay unavailable."},{status:404});
 }

 try{
  const download=new URL(request.url).searchParams.get("download")==="1";
  const url=createSignedMediaDownload(
   replayObjectKey(room.id),
   download?{downloadName:"OUTSiiDE-"+slug+".mp4"}:undefined
  );
  const response=NextResponse.redirect(url,307);
  response.headers.set("Cache-Control","private, no-store");
  return response;
 }catch(error){
  console.error("Replay media authorization failed",error);
  return NextResponse.json({error:"Replay unavailable."},{status:503});
 }
}
