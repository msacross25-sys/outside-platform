import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {authorizedClipWorker,clipObjectKey,clipMediaPath} from "@/lib/clipProcessing";
import {createSignedMediaDownload,createSignedObjectUpload} from "@/lib/mediaStorage";
import {replayObjectKey} from "@/lib/liveRecording";

export async function POST(request:Request){
 if(!authorizedClipWorker(request))return NextResponse.json({error:"Unauthorized."},{status:401});

 const staleBefore=new Date(Date.now()-15*60*1000);
 await db.clip.updateMany({
  where:{processingStatus:"PROCESSING",processingStartedAt:{lt:staleBefore}},
  data:{processingStatus:"PENDING",processingStartedAt:null,processingError:"Recovered after worker timeout."}
 });

 for(let attempt=0;attempt<5;attempt++){
  const candidate=await db.clip.findFirst({
   where:{
    processingStatus:"PENDING",
    replay:{status:"READY",mediaUrl:{not:null}}
   },
   orderBy:{createdAt:"asc"},
   select:{
    id:true,
    roomId:true,
    startSeconds:true,
    endSeconds:true,
    replay:{select:{roomId:true}}
   }
  });

  if(!candidate)return new NextResponse(null,{status:204});

  const claimed=await db.clip.updateMany({
   where:{id:candidate.id,processingStatus:"PENDING"},
   data:{processingStatus:"PROCESSING",processingStartedAt:new Date(),processingError:null}
  });
  if(claimed.count!==1)continue;

  const sourceKey=replayObjectKey(candidate.replay?.roomId??candidate.roomId);
  const outputKey=clipObjectKey(candidate.id);
  const upload=createSignedObjectUpload(outputKey,"video/mp4",30*60);

  return NextResponse.json({
   job:{
    id:candidate.id,
    startSeconds:candidate.startSeconds,
    endSeconds:candidate.endSeconds,
    sourceUrl:createSignedMediaDownload(sourceKey),
    uploadUrl:upload.uploadUrl,
    uploadHeaders:upload.headers,
    mediaUrl:clipMediaPath(candidate.id)
   }
  },{
   headers:{"Cache-Control":"no-store"}
  });
 }

 return NextResponse.json({error:"Unable to claim clip job."},{status:409});
}
