import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function POST(_:Request,{params}:{params:{username:string}}){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const target=await db.user.findUnique({where:{username:params.username.toLowerCase()},select:{id:true}});
 if(!target)return NextResponse.json({error:"User not found."},{status:404});
 if(target.id===me.id)return NextResponse.json({error:"You cannot follow yourself."},{status:400});
 await db.follow.upsert({where:{followerId_followingId:{followerId:me.id,followingId:target.id}},create:{followerId:me.id,followingId:target.id},update:{}});
 return NextResponse.json({following:true});
}
export async function DELETE(_:Request,{params}:{params:{username:string}}){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const target=await db.user.findUnique({where:{username:params.username.toLowerCase()},select:{id:true}});
 if(!target)return NextResponse.json({error:"User not found."},{status:404});
 await db.follow.deleteMany({where:{followerId:me.id,followingId:target.id}});
 return NextResponse.json({following:false});
}
