import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {deleteStoredMedia} from "@/lib/mediaStorage";
import {replayObjectKey} from "@/lib/liveRecording";
import {getReplayAccess} from "@/lib/replayAccess";

async function owned(slug:string,userId:string){
 return db.porchRoom.findUnique({
  where:{slug},
  include:{
   members:{where:{userId},select:{role:true}},
   replay:true
  }
 });
}

export async function GET(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 const access=await getReplayAccess(slug,me?.id);

 if(!access)return NextResponse.json({error:"Replay unavailable."},{status:404});

 const {
  creatorEarningsCents,
  giftValueCents,
  downloadUrl,
  verifiedWatchSeconds,
  ...safe
 }=access.replay;

 return NextResponse.json({
  replay:access.owner?access.replay:safe,
  owner:access.owner
 });
}

export async function PATCH(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const room=await owned(slug,me.id);
 if(!room||room.members[0]?.role!=="HOST"||!room.replay){
  return NextResponse.json({error:"Host replay access required."},{status:403});
 }

 const body=await request.json().catch(()=>null);
 const data:any={};

 if(typeof body?.visible==="boolean")data.visible=body.visible;

 const deleting=body?.status==="DELETED";
 if(deleting){
  data.status="DELETED";
  data.visible=false;
  data.mediaUrl=null;
  data.downloadUrl=null;
 }

 const replay=await db.liveReplay.update({
  where:{roomId:room.id},
  data
 });

 if(deleting){
  try{
   await deleteStoredMedia(replayObjectKey(room.id));
  }catch(error){
   console.error("Replay media cleanup failed",error);
  }
 }

 return NextResponse.json({replay});
}
