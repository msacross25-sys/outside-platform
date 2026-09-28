import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
async function hostRoom(slug:string,userId:string){return db.porchRoom.findFirst({where:{slug,members:{some:{userId,role:"HOST"}}},select:{id:true}})}
export async function GET(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});const room=await hostRoom(slug,me.id);if(!room)return NextResponse.json({error:"Host access required."},{status:403});
 const banned=await db.porchRoomRestriction.findMany({where:{roomId:room.id,banned:true},include:{user:{select:{username:true,displayName:true}}},orderBy:{updatedAt:"desc"}});
 return NextResponse.json({banned:banned.map(x=>({userId:x.userId,user:x.user}))});
}
export async function DELETE(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});const room=await hostRoom(slug,me.id);if(!room)return NextResponse.json({error:"Host access required."},{status:403});
 const body=await request.json().catch(()=>null);const userId=String(body?.userId??"");if(!userId)return NextResponse.json({error:"User required."},{status:400});
 await db.porchRoomRestriction.updateMany({where:{roomId:room.id,userId,banned:true},data:{banned:false}});
 return NextResponse.json({ok:true});
}