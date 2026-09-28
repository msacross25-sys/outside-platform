import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
async function member(slug:string,userId:string){return db.porchRoom.findUnique({where:{slug},include:{members:{where:{userId},select:{role:true}}}})}
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});const room=await member(slug,me.id);if(!room||room.status!=="LIVE"||!room.members.length)return NextResponse.json({error:"Live room access required."},{status:403});
 const rawSince=Number(new URL(request.url).searchParams.get("since")??Date.now()-10000);const since=Number.isFinite(rawSince)&&rawSince>0?rawSince:Date.now()-10000;const signals=await db.liveSignal.findMany({where:{roomId:room.id,createdAt:{gt:new Date(since)},OR:[{targetUserId:me.id},{targetUserId:null}],senderId:{not:me.id}},orderBy:{createdAt:"asc"},take:100,select:{id:true,senderId:true,targetUserId:true,type:true,payloadJson:true,createdAt:true}});
 return NextResponse.json({signals});
}
export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});const room=await member(slug,me.id);if(!room||room.status!=="LIVE"||!room.members.length)return NextResponse.json({error:"Live room access required."},{status:403});
 const senderRole=room.members[0]?.role;if(!["HOST","COHOST","SPEAKER"].includes(senderRole??""))return NextResponse.json({error:"Stage publishing access required."},{status:403});
 const body=await request.json().catch(()=>null);const type=String(body?.type??"");const payload=String(body?.payloadJson??"");const targetUserId=body?.targetUserId?String(body.targetUserId):null;
 if(!["offer","answer","ice","leave"].includes(type)||!payload||payload.length>20000)return NextResponse.json({error:"Invalid signaling message."},{status:400});
 if(targetUserId){const target=await db.porchMember.findUnique({where:{roomId_userId:{roomId:room.id,userId:targetUserId}},select:{userId:true}});if(!target)return NextResponse.json({error:"Target is not in the room."},{status:404})}
 const signal=await db.liveSignal.create({data:{roomId:room.id,senderId:me.id,targetUserId,type,payloadJson:payload}});
 return NextResponse.json({id:signal.id});
}