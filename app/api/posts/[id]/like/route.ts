import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
export async function POST(_:Request,{params}:{params:{id:string}}){const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});await db.reaction.upsert({where:{userId_postId:{userId:me.id,postId:params.id}},create:{userId:me.id,postId:params.id},update:{}});return NextResponse.json({liked:true});}
export async function DELETE(_:Request,{params}:{params:{id:string}}){const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});await db.reaction.deleteMany({where:{userId:me.id,postId:params.id}});return NextResponse.json({liked:false});}
