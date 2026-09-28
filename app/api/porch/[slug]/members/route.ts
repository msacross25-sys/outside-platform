import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
export async function GET(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const room=await db.porchRoom.findUnique({where:{slug},include:{members:{include:{user:{select:{id:true,username:true,displayName:true}}}}}});
 if(!room)return NextResponse.json({error:"Room not found."},{status:404});
 const restriction=await db.porchRoomRestriction.findUnique({where:{roomId_userId:{roomId:room.id,userId:me.id}},select:{banned:true}});
 if(restriction?.banned)return NextResponse.json({error:"You are banned from this room."},{status:403});
 return NextResponse.json({room:{slug:room.slug,status:room.status,roomType:room.roomType,stageSize:room.stageSize},members:room.members.map(m=>({userId:m.userId,role:m.role,user:m.user}))});
}