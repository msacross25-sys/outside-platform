import {NextResponse} from "next/server";
import {currentUser} from "@/lib/session";
import {mediaAllowed} from "@/lib/media";
import {createMediaObject,createSignedMediaUpload,mediaStorageReady} from "@/lib/mediaStorage";
import {signMediaReceipt} from "@/lib/mediaReceipt";

export async function POST(request:Request){
 const user=await currentUser();
 if(!user)return NextResponse.json({error:"Sign in required."},{status:401});

 const body=await request.json().catch(()=>null);
 const type=String(body?.type??"").toLowerCase();
 const size=Number(body?.size??0);

 if(!mediaAllowed(type,size)){
  return NextResponse.json({error:"Unsupported media type or size."},{status:400});
 }
 if(!mediaStorageReady()){
  return NextResponse.json({error:"Media storage is not configured."},{status:503});
 }

 try{
  const object=createMediaObject(user.id,type,size);
  const signed=createSignedMediaUpload(object);
  const uploadToken=signMediaReceipt({
   v:1,
   stage:"UPLOAD",
   userId:user.id,
   key:object.key,
   kind:object.kind,
   contentType:type,
   size,
   url:object.url,
   exp:Date.now()+signed.expiresInSeconds*1000
  });
  return NextResponse.json({
   ready:true,
   kind:object.kind,
   uploadUrl:signed.uploadUrl,
   headers:signed.headers,
   uploadToken,
   expiresInSeconds:signed.expiresInSeconds
  });
 }catch(error){
  console.error("Media upload authorization failed",error);
  return NextResponse.json({error:"Media upload could not be prepared."},{status:503});
 }
}
