import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
export async function GET(){const stories=await db.story.findMany({where:{expiresAt:{gt:new Date()}},orderBy:{createdAt:"desc"},take:50,include:{author:{select:{username:true,displayName:true,avatarUrl:true}}}});return NextResponse.json({stories});}
export async function POST(request:Request){const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});const body=await request.json().catch(()=>null);const text=String(body?.text??"").trim().slice(0,500);const mediaUrl=body?.mediaUrl?String(body.mediaUrl):null;if(!text&&!mediaUrl)return NextResponse.json({error:"Add text or media."},{status:400});const story=await db.story.create({data:{authorId:me.id,text:text||null,mediaUrl,expiresAt:new Date(Date.now()+86400000)}});return NextResponse.json({story},{status:201});}
