import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";

export async function GET(_:Request,{params}:{params:Promise<{username:string}>}){
 const {username}=await params;
 const me=await currentUser();
 const user=await db.user.findUnique({
  where:{username:username.toLowerCase()},
  select:{id:true,username:true,displayName:true,bio:true,avatarUrl:true,status:true,privacy:true,hideConnections:true,createdAt:true,_count:{select:{followers:true,following:true,posts:true}}}
 });
 if(!user||user.status!=="ACTIVE")return NextResponse.json({error:"User not found."},{status:404});

 if(me&&me.id!==user.id){
  const blocked=await db.block.count({where:{OR:[{blockerId:me.id,blockedId:user.id},{blockerId:user.id,blockedId:me.id}]}});
  if(blocked)return NextResponse.json({error:"Profile unavailable."},{status:404});
 }

 const [following,followsMe]=me?await Promise.all([
  db.follow.findUnique({where:{followerId_followingId:{followerId:me.id,followingId:user.id}}}),
  db.follow.findUnique({where:{followerId_followingId:{followerId:user.id,followingId:me.id}}})
 ]):[null,null];

 const isMe=me?.id===user.id;
 const counts=user.hideConnections&&!isMe?{posts:user._count.posts}:user._count;
 const {id,status,hideConnections,...safeUser}=user;
 return NextResponse.json({user:{...safeUser,_count:counts,isMe,following:Boolean(following),friends:Boolean(following&&followsMe)}});
}
