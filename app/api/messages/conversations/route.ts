import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { contactAllowed } from "@/lib/contactPrivacy";
export async function POST(request:Request){
 const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const body=await request.json().catch(()=>null);const username=String(body?.username??"").trim().toLowerCase();
 const other=await db.user.findUnique({where:{username},select:{id:true,status:true,messagePrivacy:true}});
 if(!other||other.id===me.id||other.status!=="ACTIVE")return NextResponse.json({error:"User not found."},{status:404});
 const blocked=await db.block.count({where:{OR:[{blockerId:me.id,blockedId:other.id},{blockerId:other.id,blockedId:me.id}]}});
 if(blocked)return NextResponse.json({error:"Conversation unavailable."},{status:403});
 if(!await contactAllowed(me.id,other.id,other.messagePrivacy))return NextResponse.json({error:"This account is not accepting messages from you."},{status:403});
 const directKey=[me.id,other.id].sort().join(":");
 const found=await db.conversation.findUnique({where:{directKey},select:{id:true}});
 if(found)return NextResponse.json({conversationId:found.id});
 try{
  const made=await db.conversation.create({data:{directKey,members:{create:[{userId:me.id},{userId:other.id}]}},select:{id:true}});
  return NextResponse.json({conversationId:made.id},{status:201});
 }catch(error){
  const existing=await db.conversation.findUnique({where:{directKey},select:{id:true}});
  if(existing)return NextResponse.json({conversationId:existing.id});
  console.error("Conversation creation failed",error);
  return NextResponse.json({error:"Unable to start conversation right now."},{status:500});
 }
}
