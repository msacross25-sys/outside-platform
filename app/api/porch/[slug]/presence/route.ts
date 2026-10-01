import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {getLiveMemberAccess} from "@/lib/porchAccess";
import {liveMediaProvider} from "@/lib/livekit";

export async function POST(_:Request,{params}:{params:Promise<{slug:string}>}){if(liveMediaProvider()!=="mesh")return NextResponse.json({error:"Legacy presence heartbeat is disabled in SFU mode."},{status:410});
 const {slug}=await params;const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const access=await getLiveMemberAccess(slug,me.id);
 if(!access)return NextResponse.json({error:"Live room access required."},{status:403});
 const room=access.room;
 const existing=await db.liveViewerPresence.findUnique({where:{roomId_userId:{roomId:room.id,userId:me.id}}});
 const now=new Date();
 await db.liveViewerPresence.upsert({where:{roomId_userId:{roomId:room.id,userId:me.id}},create:{roomId:room.id,userId:me.id,lastSeenAt:now},update:{lastSeenAt:now,active:true}});
 const cutoff=new Date(Date.now()-45000);
 await db.liveViewerPresence.updateMany({where:{roomId:room.id,active:true,lastSeenAt:{lt:cutoff}},data:{active:false}});
 const current=await db.liveViewerPresence.count({where:{roomId:room.id,active:true,lastSeenAt:{gte:cutoff}}});
 await db.porchRoom.update({where:{id:room.id},data:{peakViewers:current>room.peakViewers?current:room.peakViewers,...(!existing?{totalViewers:{increment:1}}:{})}});
 return NextResponse.json({current});
}
export async function DELETE(_:Request,{params}:{params:Promise<{slug:string}>}){if(liveMediaProvider()!=="mesh")return NextResponse.json({ok:true});
 const {slug}=await params;const me=await currentUser();if(!me)return NextResponse.json({ok:true});
 const room=await db.porchRoom.findUnique({where:{slug},select:{id:true}});
 if(room)await db.liveViewerPresence.updateMany({where:{roomId:room.id,userId:me.id},data:{active:false,lastSeenAt:new Date()}});
 return NextResponse.json({ok:true});
}
