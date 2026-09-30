import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {getPostAccess} from "@/lib/postAccess";
import {readMediaContentToken} from "@/lib/mediaReceipt";
import {createSignedMediaDownload,mediaStorageReady} from "@/lib/mediaStorage";

export const dynamic="force-dynamic";

export async function GET(_:Request,{params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 const payload=readMediaContentToken(token);
 if(!payload||!mediaStorageReady()){
  return NextResponse.json({error:"Media unavailable."},{status:404});
 }

 const internalUrl="/api/media/content/"+token;
 const media=await db.media.findFirst({
  where:{url:internalUrl},
  select:{postId:true,type:true}
 });
 if(!media||media.type!==payload.kind){
  return NextResponse.json({error:"Media unavailable."},{status:404});
 }

 const user=await currentUser();
 const access=await getPostAccess(media.postId,user?.id);
 if(!access){
  return NextResponse.json({error:"Media unavailable."},{status:404});
 }

 try{
  const downloadUrl=createSignedMediaDownload(payload.key);
  const response=NextResponse.redirect(downloadUrl,307);
  response.headers.set("Cache-Control","private, no-store");
  return response;
 }catch(error){
  console.error("Media download authorization failed",error);
  return NextResponse.json({error:"Media unavailable."},{status:503});
 }
}
