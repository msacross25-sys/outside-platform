import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function GET(_:Request,{params}:{params:{username:string}}){
 const me=await currentUser();
 const user=await db.user.findUnique({where:{username:params.username.toLowerCase()},select:{id:true,username:true,displayName:true,bio:true,avatarUrl:true,createdAt:true,_count:{select:{followers:true,following:true,posts:true}}}});
 if(!user)return NextResponse.json({error:"User not found."},{status:404});
 const following=me?!!(await db.follow.findUnique({where:{followerId_followingId:{followerId:me.id,followingId:user.id}}})):false;
 const followsMe=me?!!(await db.follow.findUnique({where:{followerId_followingId:{followerId:user.id,followingId:me.id}}})):false;
 return NextResponse.json({user:{...user,isMe:me?.id===user.id,following,friends:following&&followsMe}});
}
