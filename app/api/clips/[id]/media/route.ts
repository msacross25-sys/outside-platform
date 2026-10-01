import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {canViewClip} from "@/lib/clipAccess";
import {clipMediaPath,clipObjectKey} from "@/lib/clipProcessing";
import {createSignedMediaDownload} from "@/lib/mediaStorage";

export const dynamic="force-dynamic";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const me=await currentUser();

 const clip=await db.clip.findUnique({
  where:{id},
  select:{
   id:true,
   creatorId:true,
   visibility:true,
   mediaUrl:true,
   creator:{select:{status:true}}
  }
 });

 if(!clip||clip.mediaUrl!==clipMediaPath(id)||!await canViewClip(clip,me?.id)){
  return NextResponse.json({error:"Clip unavailable."},{status:404});
 }

 try{
  const url=createSignedMediaDownload(clipObjectKey(id));
  const response=NextResponse.redirect(url,307);
  response.headers.set("Cache-Control","private, no-store");
  return response;
 }catch(error){
  console.error("Clip media authorization failed",error);
  return NextResponse.json({error:"Clip unavailable."},{status:503});
 }
}
