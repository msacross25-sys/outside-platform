import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {
 clipMediaPath,
 clipProcessingReady,
 queueClipProcessing
} from "@/lib/clipProcessing";

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const clip=await db.clip.findUnique({
  where:{id},
  select:{
   id:true,
   creatorId:true,
   roomId:true,
   startSeconds:true,
   endSeconds:true,
   mediaUrl:true,
   replay:{select:{status:true}}
  }
 });

 if(!clip||clip.creatorId!==me.id){
  return NextResponse.json({error:"Clip owner access required."},{status:403});
 }
 if(clip.replay?.status!=="READY"){
  return NextResponse.json({error:"Source replay is not ready."},{status:409});
 }
 if(clip.mediaUrl===clipMediaPath(id)){
  return NextResponse.json({ready:true,mediaUrl:clip.mediaUrl});
 }
 if(!clipProcessingReady()){
  return NextResponse.json({error:"Clip processing is not configured."},{status:503});
 }

 try{
  const queued=await queueClipProcessing({
   clipId:clip.id,
   roomId:clip.roomId,
   startSeconds:clip.startSeconds,
   endSeconds:clip.endSeconds
  });

  if(queued.ready){
   const mediaUrl=clipMediaPath(clip.id);
   await db.clip.update({where:{id:clip.id},data:{mediaUrl}});
   return NextResponse.json({queued:true,ready:true,mediaUrl});
  }

  return NextResponse.json({queued:true,ready:false});
 }catch(error){
  console.error("Clip processing retry failed",error);
  return NextResponse.json({error:"Clip processing could not be queued."},{status:503});
 }
}
