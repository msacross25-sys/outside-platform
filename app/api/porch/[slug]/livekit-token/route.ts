import {NextResponse} from "next/server";
import {currentUser} from "@/lib/session";
import {getLiveMemberAccess} from "@/lib/porchAccess";
import {issueLivekitToken,livekitEnabled} from "@/lib/livekit";

export const dynamic="force-dynamic";

export async function POST(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const access=await getLiveMemberAccess(slug,me.id);
 if(!access)return NextResponse.json({error:"Live room access required."},{status:403});

 if(!livekitEnabled()){
  return NextResponse.json({error:"Production Live media is not configured."},{status:503});
 }

 try{
  const session=await issueLivekitToken({
   roomId:access.room.id,
   userId:me.id,
   displayName:me.displayName,
   role:access.member?.role
  });
  return NextResponse.json({
   ...session,
   role:access.member?.role??"LISTENER"
  },{
   headers:{
    "Cache-Control":"no-store"
   }
  });
 }catch(error){
  console.error("LiveKit token creation failed",error);
  return NextResponse.json({error:"Live media connection could not be prepared."},{status:503});
 }
}
