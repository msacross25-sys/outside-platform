import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {encryptPushSubscription,pushEndpointHash} from "@/lib/pushCrypto";
import {checkActionLimit} from "@/lib/actionLimit";

function validSubscription(value:any){
 const endpoint=String(value?.endpoint??"").trim();
 const p256dh=String(value?.keys?.p256dh??"").trim();
 const auth=String(value?.keys?.auth??"").trim();
 if(!endpoint||endpoint.length>4096||!p256dh||p256dh.length>2048||!auth||auth.length>2048)return null;
 try{
  const url=new URL(endpoint);
  if(url.protocol!=="https:")return null;
 }catch{return null}
 return {endpoint,keys:{p256dh,auth}};
}

export async function GET(){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const count=await db.pushSubscription.count({
  where:{userId:me.id,disabledAt:null}
 });
 return NextResponse.json({enabled:count>0,count});
}

export async function POST(request:Request){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const limit=await checkActionLimit(request,"push-subscription",me.id,10,60_000);
 if(!limit.allowed){
  return NextResponse.json({error:"Too many Push subscription changes."},{
   status:limit.unavailable?503:429,
   headers:{"Retry-After":String(limit.retryAfterSeconds)}
  });
 }

 const body=await request.json().catch(()=>null);
 const subscription=validSubscription(body?.subscription);
 if(!subscription)return NextResponse.json({error:"Valid Web Push subscription required."},{status:400});

 const endpointHash=pushEndpointHash(subscription.endpoint);
 const encrypted=encryptPushSubscription(subscription);
 const userAgent=(request.headers.get("user-agent")??"").slice(0,500)||null;

 const result=await db.$transaction(async tx=>{
  const existing=await tx.pushSubscription.findUnique({where:{endpointHash}});
  if(existing&&existing.userId!==me.id){
   await tx.pushSubscription.delete({where:{id:existing.id}});
  }

  return tx.pushSubscription.upsert({
   where:{endpointHash},
   create:{
    userId:me.id,
    endpointHash,
    subscriptionEncrypted:encrypted,
    userAgent,
    disabledAt:null,
    lastSeenAt:new Date()
   },
   update:{
    userId:me.id,
    subscriptionEncrypted:encrypted,
    userAgent,
    disabledAt:null,
    lastSeenAt:new Date()
   },
   select:{id:true,disabledAt:true,lastSeenAt:true}
  });
 });

 return NextResponse.json({enabled:true,subscription:result},{status:201});
}

export async function DELETE(request:Request){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const body=await request.json().catch(()=>null);
 const endpoint=String(body?.endpoint??"").trim();
 if(!endpoint)return NextResponse.json({error:"Subscription endpoint required."},{status:400});

 const result=await db.pushSubscription.deleteMany({
  where:{userId:me.id,endpointHash:pushEndpointHash(endpoint)}
 });
 return NextResponse.json({disabled:true,removed:result.count});
}
