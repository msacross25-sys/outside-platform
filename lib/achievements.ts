import {db} from "@/lib/db";
import {createNotification} from "@/lib/notifications";

const defs={
 LIVE_REGULAR:["Live Regular","📡"],
 RISING_CREATOR:["Rising Creator","🌱"],
 GIFTED:["Gifted","🎁"],
 TOP_SUPPORTER:["Top Supporter","💎"],
 OUTSIIDE_EXPLORER:["OUTSiiDE Explorer","🧭"],
 HOST:["Host","👑"],
 ESTABLISHED_HOST:["Established Host","🏕️"],
 ADVANCED_HOST:["Advanced Host","⚡"]
} as const;

export async function grantAchievement(userId:string,key:keyof typeof defs){
 const [name,icon]=defs[key];

 const created=await db.userBadge.createMany({
  data:[{userId,key,name,icon}],
  skipDuplicates:true
 });

 if(created.count===1){
  await createNotification({
   recipientId:userId,
   actorId:userId,
   type:"BADGE_UNLOCKED",
   targetUrl:"/creator"
  });
 }

 return db.userBadge.findUnique({
  where:{userId_key:{userId,key}}
 });
}

export const ACHIEVEMENTS=defs;
