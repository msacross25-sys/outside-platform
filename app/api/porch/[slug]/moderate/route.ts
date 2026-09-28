import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

async function access(slug:string,userId:string){
 const room=await db.porchRoom.findUnique({where:{slug},include:{members:{where:{userId},select:{role:true}}}});
 const role=room?.members[0]?.role;
 if(!room||!role||!["HOST","MODERATOR"].includes(role))return null;
 return {room,role};
}
export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const a=await access(slug,me.id);if(!a)return NextResponse.json({error:"Room moderation access required."},{status:403});
 const body=await request.json().catch(()=>null);const userId=String(body?.userId??"");const action=String(body?.action??"");
 if(!userId||userId===me.id||!["MUTE","UNMUTE","BAN","UNBAN"].includes(action))return NextResponse.json({error:"Valid user and moderation action required."},{status:400});
 const target=await db.porchMember.findUnique({where:{roomId_userId:{roomId:a.room.id,userId}},select:{role:true}});
 if(!target)return NextResponse.json({error:"Room participant not found."},{status:404});
 if(a.role==="MODERATOR"&&["HOST","COHOST","MODERATOR"].includes(target.role))return NextResponse.json({error:"Moderators cannot control hosts or other room staff."},{status:403});
 if(a.role==="MODERATOR"&&action==="UNBAN")return NextResponse.json({error:"Only the host can unban people."},{status:403});
 const restriction=await db.porchRoomRestriction.upsert({where:{roomId_userId:{roomId:a.room.id,userId}},create:{roomId:a.room.id,userId,muted:action==="MUTE",banned:action==="BAN"},update:action==="MUTE"?{muted:true}:action==="UNMUTE"?{muted:false}:action==="BAN"?{banned:true,muted:true}:{banned:false}});
 if(action==="BAN")await db.porchMember.deleteMany({where:{roomId:a.room.id,userId}});
 return NextResponse.json({restriction});
}