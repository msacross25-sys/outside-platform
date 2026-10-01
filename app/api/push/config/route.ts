import {NextResponse} from "next/server";
import {currentUser} from "@/lib/session";
import {webPushReady} from "@/lib/pushDelivery";

export async function GET(){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 if(!webPushReady())return NextResponse.json({ready:false},{status:503});
 return NextResponse.json({
  ready:true,
  publicKey:process.env.WEB_PUSH_VAPID_PUBLIC_KEY??"test-public-key"
 },{
  headers:{"Cache-Control":"no-store"}
 });
}
