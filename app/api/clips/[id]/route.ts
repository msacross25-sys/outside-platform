import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {canViewClip} from "@/lib/clipAccess";

async function clipFor(id:string){
 return db.clip.findUnique({
  where:{id},
  include:{
   creator:{select:{id:true,username:true,displayName:true,status:true}},
   room:{select:{slug:true,title:true}},
   _count:{select:{likes:true,comments:true}}
  }
 });
}

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const me=await currentUser();
 const clip=await clipFor(id);

 if(!clip||!await canViewClip(clip,me?.id)){
  return NextResponse.json({error:"Clip unavailable."},{status:404});
 }

 const liked=me
  ?Boolean(await db.clipLike.findUnique({
    where:{clipId_userId:{clipId:id,userId:me.id}}
   }))
  :false;

 const {status,...creator}=clip.creator;
 return NextResponse.json({
  clip:{...clip,creator},
  liked
 });
}

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const clip=await clipFor(id);
 if(!clip||!await canViewClip(clip,me.id)){
  return NextResponse.json({error:"Clip unavailable."},{status:404});
 }

 await db.clipLike.upsert({
  where:{clipId_userId:{clipId:id,userId:me.id}},
  create:{clipId:id,userId:me.id},
  update:{}
 });

 return NextResponse.json({liked:true});
}

export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const clip=await clipFor(id);
 if(!clip||!await canViewClip(clip,me.id)){
  return NextResponse.json({error:"Clip unavailable."},{status:404});
 }

 await db.clipLike.deleteMany({
  where:{clipId:id,userId:me.id}
 });

 return NextResponse.json({liked:false});
}
