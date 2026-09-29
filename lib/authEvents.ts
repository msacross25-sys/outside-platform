import {db} from "@/lib/db";
import {requestSecurityMeta} from "@/lib/requestSecurity";

export async function recordAuthEvent(request:Request,kind:string,userId?:string|null,metadata?:Record<string,unknown>){
 const {ipHash,userAgent}=requestSecurityMeta(request);
 await db.authEvent.create({
  data:{
   userId:userId??null,
   kind,
   ipHash,
   userAgent,
   metadataJson:metadata?JSON.stringify(metadata).slice(0,4000):null
  }
 });
}
