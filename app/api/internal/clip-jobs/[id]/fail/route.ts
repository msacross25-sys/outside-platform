import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {authorizedClipWorker} from "@/lib/clipProcessing";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!authorizedClipWorker(request))return NextResponse.json({error:"Unauthorized."},{status:401});
 const {id}=await params;
 const body=await request.json().catch(()=>null);
 const message=String(body?.error??"Clip processing failed.").trim().slice(0,1000)||"Clip processing failed.";

 const result=await db.clip.updateMany({
  where:{id,processingStatus:"PROCESSING"},
  data:{processingStatus:"FAILED",processingError:message,processingStartedAt:null}
 });

 if(result.count!==1){
  const clip=await db.clip.findUnique({where:{id},select:{processingStatus:true}});
  if(!clip)return NextResponse.json({error:"Clip not found."},{status:404});
  return NextResponse.json({error:"Clip is not currently processing."},{status:409});
 }

 return NextResponse.json({ok:true});
}
