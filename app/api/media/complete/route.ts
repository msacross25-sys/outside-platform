import {NextResponse} from "next/server";
import {currentUser} from "@/lib/session";
import {mediaAllowed} from "@/lib/media";
import {readMediaReceipt,signMediaReceipt} from "@/lib/mediaReceipt";
import {verifyStoredMedia} from "@/lib/mediaStorage";

export async function POST(request:Request){
 const user=await currentUser();
 if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const body=await request.json().catch(()=>null);
 const uploadToken=String(body?.uploadToken??"");
 const payload=readMediaReceipt(uploadToken,"UPLOAD");

 if(!payload||payload.userId!==user.id||!mediaAllowed(payload.contentType,payload.size)){
  return NextResponse.json({error:"Upload authorization is invalid or expired."},{status:400});
 }

 try{
  const verified=await verifyStoredMedia({
   key:payload.key,
   contentType:payload.contentType,
   size:payload.size,
   url:payload.url
  });
  const receipt=signMediaReceipt({
   ...payload,
   stage:"COMPLETE",
   contentType:verified.contentType,
   size:verified.size,
   exp:Date.now()+6*60*60*1000
  });
  return NextResponse.json({
   media:{
    type:payload.kind,
    url:payload.url,
    contentType:verified.contentType,
    size:verified.size,
    receipt
   }
  });
 }catch(error){
  console.error("Media verification failed",error);
  return NextResponse.json({error:"Uploaded media could not be verified."},{status:409});
 }
}
