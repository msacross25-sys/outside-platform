import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
const MAX_HEARTBEAT_SECONDS=90;
async function roomAndHost(slug:string){return db.porchRoom.findUnique({where:{slug},include:{members:{where:{role:"HOST"},select:{userId:true}}}})}
export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const room=await roomAndHost(slug);if(!room||room.status!=="LIVE")return NextResponse.json({error:"Live room unavailable."},{status:404});
 if(room.members.some(x=>x.userId===me.id))return NextResponse.json({error:"Watching your own live does not count toward verified viewing hours."},{status:403});
 const body=await request.json().catch(()=>null),sessionId=String(body?.sessionId??"");
 if(!sessionId){const session=await db.viewingSession.create({data:{userId:me.id,roomId:room.id}});return NextResponse.json({sessionId:session.id,verifiedSeconds:0});}
 const session=await db.viewingSession.findFirst({where:{id:sessionId,userId:me.id,roomId:room.id,endedAt:null,eligible:true}});
 if(!session)return NextResponse.json({error:"Viewing session unavailable."},{status:404});
 const now=new Date(),elapsed=Math.floor((now.getTime()-session.lastHeartbeatAt.getTime())/1000);
 if(elapsed<5)return NextResponse.json({sessionId,verifiedSeconds:session.verifiedSeconds});
 if(elapsed>MAX_HEARTBEAT_SECONDS){await db.viewingSession.update({where:{id:session.id},data:{lastHeartbeatAt:now,invalidReason:"HEARTBEAT_GAP"}});return NextResponse.json({sessionId,verifiedSeconds:session.verifiedSeconds});}
 const updated=await db.$transaction(async tx=>{const s=await tx.viewingSession.update({where:{id:session.id},data:{lastHeartbeatAt:now,verifiedSeconds:{increment:elapsed}}});await tx.viewingProgress.upsert({where:{userId:me.id},create:{userId:me.id,verifiedSeconds:BigInt(elapsed)},update:{verifiedSeconds:{increment:BigInt(elapsed)}}});return s;});
 return NextResponse.json({sessionId,verifiedSeconds:updated.verifiedSeconds});
}
export async function DELETE(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});const room=await db.porchRoom.findUnique({where:{slug},select:{id:true}});if(!room)return NextResponse.json({error:"Room unavailable."},{status:404});
 const body=await request.json().catch(()=>null),sessionId=String(body?.sessionId??"");if(!sessionId)return NextResponse.json({error:"Session required."},{status:400});
 await db.viewingSession.updateMany({where:{id:sessionId,userId:me.id,roomId:room.id,endedAt:null},data:{endedAt:new Date()}});return NextResponse.json({ended:true});
}