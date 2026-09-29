import {staffSecurityState} from "@/lib/staffSecurity";

export async function currentStaff(){
 const state=await staffSecurityState();
 if(!state.authorized||!state.auth||!state.staff)return null;
 return {user:state.auth.user,staff:state.staff};
}

export function canModerate(role:string){
 return ["OWNER","CO_OWNER","EXECUTIVE_ADMIN","TRUST_SAFETY","MODERATOR"].includes(role);
}

export function canManageHosts(role:string){
 return ["OWNER","CO_OWNER"].includes(role);
}
