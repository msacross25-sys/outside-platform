import {db} from "@/lib/db";
export const PERMANENT_CATEGORIES=["CREDIBLE_THREAT","LIFE_ENDANGERMENT"] as const;
export function isPermanentCategory(category:string){return (PERMANENT_CATEGORIES as readonly string[]).includes(category)}
export async function safetyStanding(userId:string){
 const cases=await db.trustCase.findMany({where:{targetUserId:userId,status:{in:["OPEN","REVIEWING"]}},select:{severity:true,category:true,affectsCreatorStanding:true,affectsHostStanding:true,permanentEnforcement:true}});
 const permanent=cases.some(x=>x.permanentEnforcement||isPermanentCategory(x.category));
 return {permanent,creatorEligible:!permanent&&!cases.some(x=>x.affectsCreatorStanding),hostEligible:!permanent&&!cases.some(x=>x.affectsHostStanding||x.severity==="CRITICAL"),activeCases:cases.length};
}