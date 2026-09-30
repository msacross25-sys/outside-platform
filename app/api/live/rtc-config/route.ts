import {NextResponse} from "next/server";
import {currentUser} from "@/lib/session";
import {liveKitConfigured,liveMediaMode} from "@/lib/liveTransport";

export async function GET(){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 if(liveMediaMode()==="livekit"){
  if(!liveKitConfigured()){
   return NextResponse.json({error:"Live media service is unavailable."},{status:503});
  }
  return NextResponse.json({mode:"livekit"});
 }

 const urls=(process.env.TURN_URLS??"")
  .split(",")
  .map(value=>value.trim())
  .filter(Boolean);

 const iceServers:any[]=[{urls:["stun:stun.l.google.com:19302"]}];
 if(urls.length&&process.env.TURN_USERNAME&&process.env.TURN_CREDENTIAL){
  iceServers.push({
   urls,
   username:process.env.TURN_USERNAME,
   credential:process.env.TURN_CREDENTIAL
  });
 }

 return NextResponse.json({mode:"mesh",iceServers});
}
