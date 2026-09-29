import {db} from "@/lib/db";
import {staffSecurityState} from "@/lib/staffSecurity";

export async function ownerAccess(userId:string){
 const state=await staffSecurityState(userId);
 if(!state.authorized||!state.staff)return {hq:false,platform:false,finance:false,paymentData:false,role:null};
 const main=state.staff.role==="OWNER";
 const coOwner=state.staff.role==="CO_OWNER";
 return {hq:main||coOwner,platform:main||coOwner,finance:main,paymentData:main,role:state.staff.role};
}

export async function mainOwner(userId:string){
 const x=await ownerAccess(userId);
 return x.role==="OWNER";
}

export async function coOwnerCount(){
 return db.staffProfile.count({where:{role:"CO_OWNER",active:true}});
}

export const MAX_CO_OWNERS=4;
