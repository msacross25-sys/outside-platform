import {db} from "@/lib/db";
export async function isMainOwner(userId:string){const s=await db.staffProfile.findUnique({where:{userId},select:{role:true,active:true}});return !!s?.active&&s.role==="OWNER"}
export async function assertTargetIsNotMainOwner(targetUserId:string){if(await isMainOwner(targetUserId))throw new Error("MAIN_OWNER_PROTECTED")}
export function mainOwnerProtectedError(){return {error:"The Main Owner account cannot be moderated, suspended, banned, demoted, or overridden by another platform role."}}