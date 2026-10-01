import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {getLiveMemberAccess,getPorchAccess} from "@/lib/porchAccess";
import {checkActionLimit} from "@/lib/actionLimit";

export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const limit=await checkActionLimit(request,"live-reaction",me.id,20,10000);
 if(!limit.allowed)return NextResponse.json({error:limit.unavailable?"Reactions are temporarily unavailable.":"Reaction limit reached."},{status:limit.unavailable?503:429,headers:{"Retry-After":String(limit.retryAfterSeconds)}});
 const access=await getLiveMemberAccess(slug,me.id);
 if(!access)return NextResponse.json({error:"Live room access required."},{status:403});
 const body=await request.json().catch(()=>null),emoji=String(body?.emoji??"❤️").slice(0,8);
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
