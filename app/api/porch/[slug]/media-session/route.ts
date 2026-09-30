import {NextResponse} from "next/server";
import {currentUser} from "@/lib/session";
import {getLiveMemberAccess} from "@/lib/porchAccess";
import {
 createLiveKitSession,
 liveKitConfigured,
 liveMediaMode
} from "@/lib/liveTransport";

export const dynamic="force-dynamic";

export async function GET(
 _:Request,
 {params}:{params:Promise<{slug:string}>}
){
 const {slug}=await params;
 const user=await currentUser();
 if(!user)return NextResponse.json({error:"Sign in required."},{status:401});

 const access=await getLiveMemberAccess(slug,user.id);
 if(!access)return NextResponse.json({error:"Live room access required."},{status:403});

 if(liveMediaMode()==="mesh"){
  return NextResponse.json({mode:"mesh"});
 }

 if(!liveKitConfigured()){
  return NextResponse.json({error:"Live media service is unavailable."},{status:503});
 }

 const session=await createLiveKitSession({
  roomId:access.room.id,
  userId:user.id,
  role:access.member?.role
 });

 return NextResponse.json(session,{
  headers:{"Cache-Control":"private, no-store"}
 });
}
