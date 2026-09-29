import {db} from "@/lib/db";
const defs={LIVE_REGULAR:["Live Regular","📡"],RISING_CREATOR:["Rising Creator","🌱"],GIFTED:["Gifted","🎁"],TOP_SUPPORTER:["Top Supporter","💎"],OUTSIIDE_EXPLORER:["OUTSiiDE Explorer","🧭"],HOST:["Host","👑"],ESTABLISHED_HOST:["Established Host","🏕️"],ADVANCED_HOST:["Advanced Host","⚡"]} as const;
export async function grantAchievement(userId:string,key:keyof typeof defs){const [name,icon]=defs[key];return db.userBadge.upsert({where:{userId_key:{userId,key}},create:{userId,key,name,icon},update:{}})}
export const ACHIEVEMENTS=defs;