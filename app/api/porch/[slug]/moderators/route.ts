import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

async function hostRoom(slug:string,userId:string){
 const room=await db.porchRoom.findUnique({where:{slug},include:{members:{where:{userId},select:{role:true}}}});
 if(!room||room.members[0]?.role!=="HOST")return null;
 return room;
}
export async function GET(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const room=await hostRoom(slug,me.id);if(!room)return NextResponse.json({error:"Host access required."},{status:403});
 const moderators=await db.porchMember.findMany({where:{roomId:room.id,role:"MODERATOR"},select:{userId:true,user:{select:{username:true,displayName:true}}},orderBy:{joinedAt:"asc"}});
 return NextResponse.json({moderators,limit:5});
}
export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const room=await hostRoom(slug,me.id);if(!room)return NextResponse.json({error:"Only the host can appoint moderators."},{status:403});
 const body=await request.json().catch(()=>null);const userId=String(body?.userId??"");
 if(!userId||userId===me.id)return NextResponse.json({error:"Choose a valid room participant."},{status:400});
 const member=await db.porchMember.findUnique({where:{roomId_userId:{roomId:room.id,userId}}});
 if(!member)return NextResponse.json({error:"That person must be in the room first."},{status:404});
 if(member.role==="MODERATOR")return NextResponse.json({moderator:true});
 try{
  const result=await db.$transaction(async tx=>{
   const current=await tx.porchMember.findUnique({where:{roomId_userId:{roomId:room.id,userId}}});
   if(!current)throw new Error("NOT_MEMBER");
   if(current.role==="MODERATOR")return {moderator:true,count:await tx.porchMember.count({where:{roomId:room.id,role:"MODERATOR"}})};
   const count=await tx.porchMember.count({where:{roomId:room.id,role:"MODERATOR"}});
   if(count>=5)throw new Error("MOD_LIMIT");
   await tx.porchMember.update({where:{roomId_userId:{roomId:room.id,userId}},data:{role:"MODERATOR"}});
   return {moderator:true,count:count+1};
  },{isolationLevel:"Serializable"});
  return NextResponse.json({...result,limit:5});
 }catch(error){
  if(error instanceof Error&&error.message==="NOT_MEMBER")return NextResponse.json({error:"That person must be in the room first."},{status:404});
  if(error instanceof Error&&error.message==="MOD_LIMIT")return NextResponse.json({error:"This room already has the maximum of 5 moderators."},{status:409});
  return NextResponse.json({error:"Moderator assignment changed at the same time. Please try again."},{status:409});
 }
}
export async function DELETE(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const room=await hostRoom(slug,me.id);if(!room)return NextResponse.json({error:"Only the host can remove moderators."},{status:403});
 const body=await request.json().catch(()=>null);const userId=String(body?.userId??"");
 const member=await db.porchMember.findUnique({where:{roomId_userId:{roomId:room.id,userId}}});
 if(!member||member.role!=="MODERATOR")return NextResponse.json({error:"Moderator not found."},{status:404});
 await db.porchMember.update({where:{roomId_userId:{roomId:room.id,userId}},data:{role:"LISTENER"}});
 return NextResponse.json({moderator:false});
}