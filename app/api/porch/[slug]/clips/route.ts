import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {filterViewableClips} from "@/lib/clipAccess";
import {clipMediaPath,clipProcessingReady,queueClipProcessing} from "@/lib/clipProcessing";

export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const room=await db.porchRoom.findUnique({
  where:{slug},
  include:{
   members:{where:{userId:me.id},select:{role:true}},
   replay:true
  }
 });

 if(!room||room.members[0]?.role!=="HOST"||!room.replay){
  return NextResponse.json({error:"Host replay access required."},{status:403});
 }
 if(room.replay.status==="DELETED"){
  return NextResponse.json({error:"Deleted replays cannot create clips."},{status:409});
 }
 if(room.replay.status!=="READY"||!room.replay.mediaUrl){
  return NextResponse.json({error:"Clips can be created after the replay media is ready."},{status:409});
 }

 const body=await request.json().catch(()=>null);
 const start=Math.max(0,Math.floor(Number(body?.startSeconds??0)));
 const end=Math.floor(Number(body?.endSeconds??0));

 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>120||end>room.replay.durationSeconds){
  return NextResponse.json({error:"Choose a clip between 1 and 120 seconds within the replay."},{status:400});
 }

 const visibility=["PUBLIC","FOLLOWERS","PRIVATE"].includes(body?.visibility)
  ?body.visibility
  :"PUBLIC";

 let clip=await db.clip.create({
  data:{
   creatorId:me.id,
   roomId:room.id,
   replayId:room.replay.id,
   title:String(body?.title??"").trim().slice(0,100)||null,
   startSeconds:start,
   endSeconds:end,
   visibility
  }
 });

 let processingQueued=false;
 let processingReady=false;
 let processingError:string|null=null;

 if(clipProcessingReady()){
  try{
   const queued=await queueClipProcessing({
    clipId:clip.id,
    roomId:clip.roomId,
    startSeconds:clip.startSeconds,
    endSeconds:clip.endSeconds
   });
   processingQueued=queued.queued;
   processingReady=queued.ready;

   if(queued.ready){
    clip=await db.clip.update({
     where:{id:clip.id},
     data:{mediaUrl:clipMediaPath(clip.id)}
    });
   }
  }catch(error){
   console.error("Initial clip processing queue failed",error);
   processingError="Clip saved, but processing could not be queued. Retry from the clip controls.";
  }
 }else{
  processingError="Clip saved, but media processing is not configured.";
 }

 return NextResponse.json({
  clip,
  processingRequired:!processingReady,
  processingQueued,
  processingReady,
  processingError
 },{status:201});
}

export async function GET(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 const room=await db.porchRoom.findUnique({where:{slug},select:{id:true}});
 if(!room)return NextResponse.json({error:"Room not found."},{status:404});

 const clips=await db.clip.findMany({
  where:{roomId:room.id},
  orderBy:{createdAt:"desc"},
  take:30,
  include:{
   creator:{select:{status:true}}
  }
 });

 const allowed=await filterViewableClips(clips,me?.id);
 return NextResponse.json({
  clips:allowed.map(({creator,...clip})=>clip)
 });
}
