import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {authorizedPushWorker} from "@/lib/pushDelivery";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!authorizedPushWorker(request))return NextResponse.json({error:"Unauthorized."},{status:401});
 const {id}=await params;

 const delivery=await db.pushDelivery.findUnique({
  where:{id},
  select:{status:true,subscriptionId:true}
 });
 if(!delivery)return NextResponse.json({error:"Push delivery not found."},{status:404});
 if(delivery.status==="SENT")return NextResponse.json({ok:true,alreadySent:true});
 if(delivery.status!=="SENDING")return NextResponse.json({error:"Push delivery is not currently sending."},{status:409});

 await db.$transaction([
  db.pushDelivery.update({
   where:{id},
   data:{status:"SENT",sentAt:new Date(),claimedAt:null,lastError:null}
  }),
  db.pushSubscription.update({
   where:{id:delivery.subscriptionId},
   data:{lastSeenAt:new Date(),disabledAt:null}
  })
 ]);

 return NextResponse.json({ok:true});
}
