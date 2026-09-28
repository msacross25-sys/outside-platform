import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
export async function GET(){const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});const conversations=await db.conversation.findMany({where:{members:{some:{userId:me.id}}},orderBy:{updatedAt:"desc"},include:{members:{include:{user:{select:{username:true,displayName:true,avatarUrl:true}}}},messages:{orderBy:{createdAt:"desc"},take:1}}});return NextResponse.json({conversations:conversations.map((c:any)=>({...c,members:c.members.filter((m:any)=>m.userId!==me.id)}))});}
