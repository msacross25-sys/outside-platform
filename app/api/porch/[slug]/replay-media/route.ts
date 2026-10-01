import {NextResponse} from "next/server";
import {currentUser} from "@/lib/session";
import {createSignedMediaDownload} from "@/lib/mediaStorage";
import {replayObjectKey} from "@/lib/liveRecording";
import {getReplayAccess} from "@/lib/replayAccess";

export const dynamic="force-dynamic";

export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 const access=await getReplayAccess(slug,me?.id);

 if(!access||access.replay.status!=="READY"){
  return NextResponse.json({error:"Replay unavailable."},{status:404});
 }

 try{
  const download=new URL(request.url).searchParams.get("download")==="1";
  const url=createSignedMediaDownload(
   replayObjectKey(access.room.id),
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
