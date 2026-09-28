import {db} from "@/lib/db";
export async function contactAllowed(senderId:string,targetId:string,setting:"EVERYONE"|"FOLLOWERS"|"FRIENDS"|"NOBODY"){
 if(senderId===targetId)return true;if(setting==="EVERYONE")return true;if(setting==="NOBODY")return false;
 const senderFollowsTarget=await db.follow.findUnique({where:{followerId_followingId:{followerId:senderId,followingId:targetId}}});
 if(setting==="FOLLOWERS")return Boolean(senderFollowsTarget);
 const targetFollowsSender=await db.follow.findUnique({where:{followerId_followingId:{followerId:targetId,followingId:senderId}}});
 return Boolean(senderFollowsTarget&&targetFollowsSender);
}