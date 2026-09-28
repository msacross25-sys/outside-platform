import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
export async function POST(request:Request){
 const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const body=await request.json().catch(()=>null);const username=String(body?.username??"").trim().toLowerCase();
 const other=await db.user.findUnique({where:{username},select:{id:true}});
 if(!other||other.id===me.id)return NextResponse.json({error:"User not found."},{status:404});
 const blocked=await db.block.count({where:{OR:[{blockerId:me.id,blockedId:other.id},{blockerId:other.id,blockedId:me.id}]}});
 if(blocked)return NextResponse.json({error:"Conversation unavailable."},{status:403});
 const candidates=await db.conversation.findMany({where:{members:{some:{userId:me.id}}},select:{id:true,members:{select:{userId:true}}}});
 const found=candidates.find((x:{members:{userId:string}[];id:string})=>x.members.length===2&&x.members.some((m:{userId:string})=>m.userId===other.id));
 if(found)return NextResponse.json({conversationId:found.id});
 const made=await db.conversation.create({data:{members:{create:[{userId:me.id},{userId:other.id}]}},select:{id:true}});
 return NextResponse.json({conversationId:made.id},{status:201});
}
