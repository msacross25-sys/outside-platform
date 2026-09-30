import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {readMediaReceipt} from "@/lib/mediaReceipt";
import {deleteStoredMedia} from "@/lib/mediaStorage";

export async function DELETE(request:Request){
 const user=await currentUser();
 if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const body=await request.json().catch(()=>null);
 const token=String(body?.token??"");
 const payload=readMediaReceipt(token);

 if(!payload||payload.userId!==user.id){
  return NextResponse.json({error:"Media authorization is invalid or expired."},{status:400});
 }

 const attached=await db.media.count({where:{url:payload.url}});
 if(attached>0){
  return NextResponse.json({error:"Media already belongs to a published post."},{status:409});
 }

 try{
  await deleteStoredMedia(payload.key);
  return NextResponse.json({deleted:true});
 }catch(error){
  console.error("Media cleanup failed",error);
  return NextResponse.json({error:"Media could not be deleted."},{status:503});
 }
}
