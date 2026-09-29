import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {getLiveMemberAccess} from "@/lib/porchAccess";

export async function GET(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const access=await getLiveMemberAccess(slug,me.id);
 if(!access)return NextResponse.json({error:"Live room access required."},{status:403});
 const room=await db.porchRoom.findUnique({where:{id:access.room.id},include:{members:{include:{user:{select:{id:true,username:true,displayName:true}}}}}});
 if(!room)return NextResponse.json({error:"Room not found."},{status:404});
 return NextResponse.json({room:{slug:room.slug,status:room.status,roomType:room.roomType,stageSize:room.stageSize},members:room.members.map(m=>({userId:m.userId,role:m.role,user:m.user}))});
}
