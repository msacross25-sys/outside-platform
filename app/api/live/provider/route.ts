import {NextResponse} from "next/server";
import {currentUser} from "@/lib/session";
import {livekitEnabled,liveMediaProvider} from "@/lib/livekit";

export async function GET(){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const provider=liveMediaProvider();
 return NextResponse.json({
  provider,
  ready:provider==="mesh"?true:livekitEnabled()
 },{
  headers:{"Cache-Control":"no-store"}
 });
}
