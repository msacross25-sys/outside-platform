import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
export async function POST(request:Request,{params}:{params:{id:string}}){const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});const body=await request.json().catch(()=>null);const text=String(body?.body??"").trim().slice(0,1000);if(!text)return NextResponse.json({error:"Comment cannot be empty."},{status:400});const comment=await db.comment.create({data:{postId:params.id,authorId:me.id,body:text},select:{id:true,body:true,createdAt:true}});return NextResponse.json({comment},{status:201});}
