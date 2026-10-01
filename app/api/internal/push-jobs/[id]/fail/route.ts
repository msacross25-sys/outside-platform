import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {authorizedPushWorker,pushRetryDelayMs} from "@/lib/pushDelivery";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!authorizedPushWorker(request))return NextResponse.json({error:"Unauthorized."},{status:401});
 const {id}=await params;
 const body=await request.json().catch(()=>null);
 const statusCode=Number(body?.statusCode??0);
 const message=String(body?.error??"Web Push delivery failed.").trim().slice(0,1000)||"Web Push delivery failed.";

 const delivery=await db.pushDelivery.findUnique({
  where:{id},
  select:{status:true,attempts:true,subscriptionId:true}
 });
 if(!delivery)return NextResponse.json({error:"Push delivery not found."},{status:404});
 if(delivery.status!=="SENDING")return NextResponse.json({error:"Push delivery is not currently sending."},{status:409});

 if(statusCode===404||statusCode===410){
  await db.$transaction([
   db.pushDelivery.update({
    where:{id},
    data:{status:"DEAD",claimedAt:null,lastError:"Push endpoint expired: "+message}
   }),
   db.pushSubscription.update({
    where:{id:delivery.subscriptionId},
    data:{disabledAt:new Date()}
   })
  ]);
  return NextResponse.json({ok:true,disabled:true});
 }

 if(delivery.attempts>=5){
  await db.pushDelivery.update({
   where:{id},
   data:{status:"DEAD",claimedAt:null,lastError:message}
  });
  return NextResponse.json({ok:true,dead:true});
 }

 await db.pushDelivery.update({
  where:{id},
  data:{
   status:"RETRY",
   claimedAt:null,
   nextAttemptAt:new Date(Date.now()+pushRetryDelayMs(delivery.attempts)),
   lastError:message
  }
 });

 return NextResponse.json({ok:true,retry:true});
}
