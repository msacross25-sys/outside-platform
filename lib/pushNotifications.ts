import webpush from "web-push";
import {db} from "@/lib/db";

export type PushPayload={
 title:string;
 body:string;
 url:string;
 tag?:string;
};

export function webPushTestMode(){
 return process.env.WEB_PUSH_TEST_MODE==="true";
}

export function webPushReady(){
 if(webPushTestMode())return true;
 return Boolean(
  process.env.WEB_PUSH_VAPID_PUBLIC_KEY&&
  process.env.WEB_PUSH_VAPID_PRIVATE_KEY&&
  process.env.WEB_PUSH_SUBJECT
 );
}

function configure(){
 if(webPushTestMode())return;
 const subject=process.env.WEB_PUSH_SUBJECT;
 const publicKey=process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
 const privateKey=process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
 if(!subject||!publicKey||!privateKey)throw new Error("Web Push VAPID configuration is incomplete.");
 webpush.setVapidDetails(subject,publicKey,privateKey);
}

export async function sendPushToUser(userId:string,payload:PushPayload){
 if(!webPushReady())return {sent:0,disabled:0};

 const subscriptions=await db.pushSubscription.findMany({
  where:{userId,disabledAt:null}
 });
 if(!subscriptions.length)return {sent:0,disabled:0};

 if(webPushTestMode()){
  return {sent:subscriptions.length,disabled:0};
 }

 configure();
 let sent=0;
 let disabled=0;

 for(const subscription of subscriptions){
  try{
   await webpush.sendNotification({
    endpoint:subscription.endpoint,
    keys:{
     p256dh:subscription.p256dh,
     auth:subscription.auth
    }
   },JSON.stringify(payload),{
    TTL:60*60,
    urgency:"normal"
   });
   sent++;
   await db.pushSubscription.update({
    where:{id:subscription.id},
    data:{lastSeenAt:new Date()}
   });
  }catch(error:any){
   const statusCode=Number(error?.statusCode??0);
   if(statusCode===404||statusCode===410){
    disabled++;
    await db.pushSubscription.update({
     where:{id:subscription.id},
     data:{disabledAt:new Date()}
    });
    continue;
   }
   console.error("Web Push delivery failed",{userId,subscriptionId:subscription.id,statusCode});
  }
 }

 return {sent,disabled};
}
