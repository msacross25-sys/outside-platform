import {NextResponse} from "next/server";
import {currentUser} from "@/lib/session";
import {liveMediaProvider} from "@/lib/livekit";

export async function GET(){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 if(liveMediaProvider()!=="mesh"){
  return NextResponse.json({error:"Legacy mesh RTC is disabled."},{status:410});
 }
 const urls=(process.env.TURN_URLS??"").split(",").map(x=>x.trim()).filter(Boolean);
 const iceServers:any[]=[{urls:["stun:stun.l.google.com:19302"]}];
 if(urls.length&&process.env.TURN_USERNAME&&process.env.TURN_CREDENTIAL){
  iceServers.push({urls,username:process.env.TURN_USERNAME,credential:process.env.TURN_CREDENTIAL});
 }
 return NextResponse.json({iceServers},{headers:{"Cache-Control":"no-store"}});
}
