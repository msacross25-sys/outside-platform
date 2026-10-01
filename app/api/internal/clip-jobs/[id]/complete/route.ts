import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {authorizedClipWorker,clipObjectKey,clipMediaPath} from "@/lib/clipProcessing";
import {inspectStoredObject} from "@/lib/mediaStorage";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!authorizedClipWorker(request))return NextResponse.json({error:"Unauthorized."},{status:401});
 const {id}=await params;

 const clip=await db.clip.findUnique({where:{id},select:{id:true,processingStatus:true}});
 if(!clip)return NextResponse.json({error:"Clip not found."},{status:404});
 if(clip.processingStatus==="READY")return NextResponse.json({ok:true,alreadyReady:true});
 if(clip.processingStatus!=="PROCESSING")return NextResponse.json({error:"Clip is not currently processing."},{status:409});

 try{
  const object=await inspectStoredObject(clipObjectKey(id));
  if(!object.exists||object.size<=0)return NextResponse.json({error:"Processed clip object is missing."},{status:409});
  if(object.contentType&&object.contentType!=="video/mp4"){
   return NextResponse.json({error:"Processed clip object has an unexpected media type."},{status:409});
  }

  const updated=await db.clip.update({
   where:{id},
   data:{
    processingStatus:"READY",
    processingError:null,
    readyAt:new Date(),
    mediaUrl:clipMediaPath(id)
   }
  });
  return NextResponse.json({clip:updated});
 }catch(error){
  console.error("Clip completion verification failed",error);
  return NextResponse.json({error:"Processed clip could not be verified."},{status:503});
 }
}
