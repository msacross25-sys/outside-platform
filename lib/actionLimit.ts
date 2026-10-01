import {consumeDistributedLimit} from "@/lib/distributedRateLimit";
import {requestSecurityMeta} from "@/lib/requestSecurity";

export async function checkActionLimit(
 request:Request,
 namespace:string,
 userId:string|null|undefined,
 limit:number,
 windowMs:number
){
 const {ipHash}=requestSecurityMeta(request);
 const result=await consumeDistributedLimit(
  namespace,
  (userId??"anonymous")+"|"+ipHash,
  limit,
  windowMs
 );
 if(!result){
  return {allowed:false,retryAfterSeconds:1,unavailable:true};
 }
 return {...result,unavailable:false};
}
