import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const room=await db.porchRoom.findUnique({where:{slug},include:{members:{where:{userId:me.id},select:{role:true}}}});
 if(!room||room.members[0]?.role!=="HOST")return NextResponse.json({error:"Only the host can control screen sharing."},{status:403});
 const body=await request.json().catch(()=>null);if(typeof body?.enabled!=="boolean")return NextResponse.json({error:"Screen sharing state required."},{status:400});
 const updated=await db.porchRoom.update({where:{id:room.id},data:{screenSharing:body.enabled},select:{screenSharing:true}});
 return NextResponse.json(updated);
}