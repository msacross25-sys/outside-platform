import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {
 clipMediaPath,
 verifyProcessedClip,
 verifyProcessorSignature
} from "@/lib/clipProcessing";
import {deleteStoredMedia} from "@/lib/mediaStorage";
import {clipObjectKey} from "@/lib/clipProcessing";

export const dynamic="force-dynamic";

export async function POST(request:Request){
 const declaredLength=Number(request.headers.get("content-length")??"0");
 if(Number.isFinite(declaredLength)&&declaredLength>16384){
  return NextResponse.json({error:"Callback body is too large."},{status:413});
 }
 const raw=await request.text();
 if(Buffer.byteLength(raw,"utf8")>16384){
  return NextResponse.json({error:"Callback body is too large."},{status:413});
 }

 let verified=false;
 try{
  verified=verifyProcessorSignature(
   raw,
   request.headers.get("x-outside-signature")
  );
 }catch{
  return NextResponse.json({error:"Processor callback is not configured."},{status:503});
 }

 if(!verified){
  return NextResponse.json({error:"Unauthorized."},{status:401});
 }

 let body:any;
 try{
  body=JSON.parse(raw);
 }catch{
  return NextResponse.json({error:"Invalid callback body."},{status:400});
 }

 const clipId=String(body?.clipId??"");
 const status=String(body?.status??"").toUpperCase();
 if(!clipId||!["READY","FAILED"].includes(status)){
  return NextResponse.json({error:"Invalid callback state."},{status:400});
 }

 const clip=await db.clip.findUnique({where:{id:clipId},select:{id:true,mediaUrl:true}});
 if(!clip){
  if(status==="READY"){
   try{await deleteStoredMedia(clipObjectKey(clipId))}catch{}
  }
  return NextResponse.json({ok:true});
 }

 if(status==="FAILED"){
  try{await deleteStoredMedia(clipObjectKey(clipId))}catch{}
  return NextResponse.json({ok:true,status:"FAILED"});
 }

 try{
  await verifyProcessedClip(clipId);
 }catch(error){
  console.error("Processed clip verification failed",error);
  return NextResponse.json({error:"Processed clip could not be verified."},{status:409});
 }

 const mediaUrl=clipMediaPath(clipId);
 if(clip.mediaUrl!==mediaUrl){
  await db.clip.update({
   where:{id:clipId},
   data:{mediaUrl}
  });
 }

 return NextResponse.json({ok:true,status:"READY"});
}
