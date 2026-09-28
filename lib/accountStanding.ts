import {db} from "@/lib/db";
import {safetyStanding} from "@/lib/safetyStanding";
export async function accountStanding(userId:string){
 const safety=await safetyStanding(userId);const [user,openCases]=await Promise.all([db.user.findUnique({where:{id:userId},select:{status:true}}),db.trustCase.findMany({where:{targetUserId:userId,status:{in:["OPEN","REVIEWING"]}},select:{severity:true,accountLevel:true,affectsCreatorStanding:true,affectsHostStanding:true}})]);
 const serious=openCases.some(c=>c.accountLevel&&["HIGH","CRITICAL"].includes(c.severity));
 return {accountStatus:user?.status??"BANNED",goodStanding:user?.status==="ACTIVE"&&!serious,creatorEligible:user?.status==="ACTIVE"&&safety.creatorEligible&&!openCases.some(c=>c.affectsCreatorStanding),hostEligible:user?.status==="ACTIVE"&&safety.hostEligible&&!openCases.some(c=>c.affectsHostStanding),openCaseCount:openCases.length};
}