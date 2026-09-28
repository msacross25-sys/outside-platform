import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const room=await db.porchRoom.findUnique({where:{slug},include:{members:{where:{userId:me.id},select:{role:true}}}});
 if(!room||room.members[0]?.role!=="HOST")return NextResponse.json({error:"Only the host can control room status."},{status:403});
 const body=await request.json().catch(()=>null);const action=String(body?.action??"");
 if(action==="START"){
  if(room.status==="LIVE")return NextResponse.json({status:"LIVE"});
  if(room.status==="ENDED"||room.status==="CANCELLED")return NextResponse.json({error:"This room cannot be restarted."},{status:409});
  const updated=await db.porchRoom.update({where:{id:room.id},data:{status:"LIVE",startedAt:new Date(),endedAt:null},select:{status:true,startedAt:true}});
  return NextResponse.json(updated);
 }
 if(action==="END"){
  if(room.status==="ENDED")return NextResponse.json({status:"ENDED"});
  const updated=await db.porchRoom.update({where:{id:room.id},data:{status:"ENDED",endedAt:new Date(),screenSharing:false},select:{status:true,endedAt:true}});
  await db.viewingSession.updateMany({where:{roomId:room.id,endedAt:null},data:{endedAt:new Date()}});
  return NextResponse.json(updated);
 }
 if(action==="CANCEL"){
  if(room.status==="LIVE"||room.status==="ENDED")return NextResponse.json({error:"A live or ended room cannot be cancelled."},{status:409});
  const updated=await db.porchRoom.update({where:{id:room.id},data:{status:"CANCELLED"},select:{status:true}});
  return NextResponse.json(updated);
 }
 return NextResponse.json({error:"Action must be START, END, or CANCEL."},{status:400});
}