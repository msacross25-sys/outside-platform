import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {getLiveMemberAccess,getPorchAccess} from "@/lib/porchAccess";

export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const access=await getLiveMemberAccess(slug,me.id);
 if(!access)return NextResponse.json({error:"Live room access required."},{status:403});
 const body=await request.json().catch(()=>null),emoji=String(body?.emoji??"❤️").slice(0,8);
 const recent=await db.liveReaction.count({where:{roomId:access.room.id,userId:me.id,createdAt:{gt:new Date(Date.now()-10000)}}});
 if(recent>=20)return NextResponse.json({error:"Reaction limit reached. Try again in a moment."},{status:429});
 await db.$transaction([
  db.liveReaction.create({data:{roomId:access.room.id,userId:me.id,emoji}}),
  db.porchRoom.update({where:{id:access.room.id},data:{reactionCount:{increment:1}}})
 ]);
 return NextResponse.json({ok:true});
}

export async function GET(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();
 const access=await getPorchAccess(slug,me?.id);
 if(!access.room||!access.allowed)return NextResponse.json({error:"Room not found."},{status:404});
 return NextResponse.json({count:access.room.reactionCount});
}
