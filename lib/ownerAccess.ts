import {db} from "@/lib/db";
export async function ownerAccess(userId:string){
 const staff=await db.staffProfile.findUnique({where:{userId}});
 if(!staff?.active)return {hq:false,platform:false,finance:false,paymentData:false,role:null};
 const main=staff.role==="OWNER";
 const coOwner=staff.role==="CO_OWNER";
 return {hq:main||coOwner,platform:main||coOwner,finance:main,paymentData:main,role:staff.role};
}
export async function mainOwner(userId:string){const x=await ownerAccess(userId);return x.role==="OWNER"}
export async function coOwnerCount(){return db.staffProfile.count({where:{role:"CO_OWNER",active:true}})}
export const MAX_CO_OWNERS=4;