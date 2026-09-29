import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";

export async function GET(){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const [blocks,mutes]=await Promise.all([
  db.block.findMany({where:{OR:[{blockerId:me.id},{blockedId:me.id}]},select:{blockerId:true,blockedId:true}}),
  db.mute.findMany({where:{muterId:me.id},select:{mutedId:true}})
 ]);
 const excluded=[...new Set([...blocks.flatMap(x=>[x.blockerId,x.blockedId]),...mutes.map(x=>x.mutedId)])].filter(x=>x!==me.id);
 const notifications=await db.notification.findMany({
  where:{recipientId:me.id,actorId:excluded.length?{notIn:excluded}:undefined},
  orderBy:{createdAt:"desc"},
  take:50,
  include:{actor:{select:{username:true,displayName:true,avatarUrl:true}}}
 });
 return NextResponse.json({notifications});
}

export async function PATCH(){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 await db.notification.updateMany({where:{recipientId:me.id,readAt:null},data:{readAt:new Date()}});
 return NextResponse.json({ok:true});
}
