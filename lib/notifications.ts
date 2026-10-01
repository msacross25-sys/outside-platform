import type {NotificationType,Prisma} from "@prisma/client";
import {db} from "@/lib/db";

type Client=Prisma.TransactionClient|typeof db;

export type NotificationInput={
 recipientId:string;
 actorId:string;
 type:NotificationType;
 postId?:string|null;
 targetUrl?:string|null;
};

export async function createNotification(input:NotificationInput,client:Client=db){
 const notification=await client.notification.create({
  data:{
   recipientId:input.recipientId,
   actorId:input.actorId,
   type:input.type,
   postId:input.postId??null,
   targetUrl:input.targetUrl??null
  }
 });

 const subscriptions=await client.pushSubscription.findMany({
  where:{userId:input.recipientId,disabledAt:null},
  select:{id:true}
 });

 if(subscriptions.length){
  await client.pushDelivery.createMany({
   data:subscriptions.map(subscription=>({
    notificationId:notification.id,
    subscriptionId:subscription.id
   })),
   skipDuplicates:true
  });
 }

 return notification;
}

export async function createNotifications(inputs:NotificationInput[],client:Client=db){
 const results=[];
 for(const input of inputs){
  results.push(await createNotification(input,client));
 }
 return results;
}

export function notificationCopy(type:NotificationType,actorDisplayName:string){
 switch(type){
  case "FOLLOW":return {title:"New follower",body:actorDisplayName+" followed you."};
  case "LIKE":return {title:"New like",body:actorDisplayName+" liked your post."};
  case "COMMENT":return {title:"New comment",body:actorDisplayName+" commented on your post."};
  case "FOLLOW_REQUEST":return {title:"Follow request",body:actorDisplayName+" requested to follow you."};
  case "MESSAGE":return {title:"New message",body:actorDisplayName+" sent you a message."};
  case "LIVE_STARTED":return {title:"OUTSiiDE Live",body:actorDisplayName+" is LIVE now."};
  case "GIFT_RECEIVED":return {title:"Gift received",body:actorDisplayName+" sent you a gift."};
  case "FOLLOWER_MILESTONE":return {title:"Follower milestone",body:"You reached a new follower milestone."};
  case "REPLAY_READY":return {title:"Replay ready",body:"Your Live replay is ready."};
  case "CREATOR_LEVEL":return {title:"Creator level",body:"You unlocked a new Creator level."};
  case "BADGE_UNLOCKED":return {title:"Achievement unlocked",body:"You unlocked a new achievement."};
 }
}
