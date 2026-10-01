import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {clipObjectKey} from "@/lib/clipProcessing";
import {deleteStoredMedia} from "@/lib/mediaStorage";

export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const clip=await db.clip.findUnique({
  where:{id},
  select:{id:true,creatorId:true}
 });

 if(!clip||clip.creatorId!==me.id){
  return NextResponse.json({error:"Clip owner access required."},{status:403});
 }

 await db.clip.delete({where:{id}});

 try{
  await deleteStoredMedia(clipObjectKey(id));
 }catch(error){
  console.error("Clip media cleanup failed",error);
 }

 return NextResponse.json({deleted:true});
}
