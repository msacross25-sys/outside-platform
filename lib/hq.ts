import { currentUser } from "@/lib/session";
import { db } from "@/lib/db";
export async function currentStaff(){const user=await currentUser();if(!user)return null;const staff=await db.staffProfile.findUnique({where:{userId:user.id}});if(!staff?.active)return null;return {user,staff};}
export function canModerate(role:string){return ["OWNER","EXECUTIVE_ADMIN","TRUST_SAFETY","MODERATOR"].includes(role)}
