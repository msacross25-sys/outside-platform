import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {authorizedPushWorker} from "@/lib/pushDelivery";
import {decryptPushSubscription} from "@/lib/pushCrypto";
import {notificationCopy} from "@/lib/notifications";

export async function POST(request:Request){
 if(!authorizedPushWorker(request))return NextResponse.json({error:"Unauthorized."},{status:401});

 const now=new Date();
 const staleBefore=new Date(now.getTime()-10*60*1000);
 await db.pushDelivery.updateMany({
  where:{status:"SENDING",claimedAt:{lt:staleBefore}},
  data:{
   status:"RETRY",
   claimedAt:null,
   nextAttemptAt:now,
   lastError:"Recovered after worker timeout."
  }
 });

 for(let attempt=0;attempt<10;attempt++){
  const candidate=await db.pushDelivery.findFirst({
   where:{
    status:{in:["PENDING","RETRY"]},
    nextAttemptAt:{lte:now},
    subscription:{disabledAt:null}
   },
   orderBy:[{nextAttemptAt:"asc"},{createdAt:"asc"}],
   select:{id:true,status:true}
  });
  if(!candidate)return new NextResponse(null,{status:204});

  const claimed=await db.pushDelivery.updateMany({
   where:{id:candidate.id,status:candidate.status,nextAttemptAt:{lte:now}},
   data:{status:"SENDING",claimedAt:new Date(),attempts:{increment:1},lastError:null}
  });
  if(claimed.count!==1)continue;

  const delivery=await db.pushDelivery.findUnique({
   where:{id:candidate.id},
   include:{
    subscription:true,
    notification:{
     include:{
      actor:{select:{id:true,username:true,displayName:true,status:true}},
      recipient:{select:{id:true,status:true}}
     }
    }
   }
  });

  if(!delivery)return continue;

  const actor=delivery.notification.actor;
  const recipient=delivery.notification.recipient;

  if(actor.status!=="ACTIVE"||recipient.status!=="ACTIVE"){
   await db.pushDelivery.update({
    where:{id:delivery.id},
    data:{status:"DEAD",claimedAt:null,lastError:"Suppressed because an account is unavailable."}
   });
   continue;
  }

  const [blocked,muted]=await Promise.all([
   db.block.count({
    where:{OR:[
     {blockerId:recipient.id,blockedId:actor.id},
     {blockerId:actor.id,blockedId:recipient.id}
    ]}
   }),
   db.mute.count({
    where:{muterId:recipient.id,mutedId:actor.id}
   })
  ]);

  if(blocked||muted){
   await db.pushDelivery.update({
    where:{id:delivery.id},
    data:{status:"DEAD",claimedAt:null,lastError:"Suppressed by current safety preferences."}
   });
   continue;
  }

  let subscription;
  try{
   subscription=decryptPushSubscription(delivery.subscription.subscriptionEncrypted);
  }catch{
   await db.pushDelivery.update({
    where:{id:delivery.id},
    data:{status:"DEAD",claimedAt:null,lastError:"Stored subscription could not be decrypted."}
   });
   await db.pushSubscription.update({
    where:{id:delivery.subscription.id},
    data:{disabledAt:new Date()}
   });
   continue;
  }

  const copy=notificationCopy(delivery.notification.type,actor.displayName);
  const fallbackUrl=delivery.notification.postId
   ?"/post/"+delivery.notification.postId
   :"/u/"+actor.username;

  return NextResponse.json({
   job:{
    id:delivery.id,
    subscriptionId:delivery.subscription.id,
    subscription,
    payload:{
     title:copy.title,
     body:copy.body,
     url:delivery.notification.targetUrl||fallbackUrl,
     tag:"outside-"+delivery.notification.type+"-"+delivery.notification.id
    }
   }
  },{
   headers:{"Cache-Control":"no-store"}
  });
 }

 return NextResponse.json({error:"Unable to claim Push job."},{status:409});
}
