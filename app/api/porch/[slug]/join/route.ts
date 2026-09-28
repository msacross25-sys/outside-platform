import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
export async function POST(_:Request,{params}:{params:Promise<{slug:string}>}){const {slug}=await params;const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});const room=await db.porchRoom.findUnique({where:{slug:slug}});if(!room||["ENDED","CANCELLED"].includes(room.status))return NextResponse.json({error:"Room unavailable."},{status:404});await db.porchMember.upsert({where:{roomId_userId:{roomId:room.id,userId:me.id}},create:{roomId:room.id,userId:me.id,role:"LISTENER"},update:{}});return NextResponse.json({joined:true});}
