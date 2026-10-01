import {getRedis} from "@/lib/redis";
import {securityDigest} from "@/lib/requestSecurity";

const SCRIPT=`
local count=redis.call("INCR",KEYS[1])
local ttl=redis.call("PTTL",KEYS[1])
if count==1 or ttl<0 then
 redis.call("PEXPIRE",KEYS[1],ARGV[1])
 ttl=tonumber(ARGV[1])
end
return {count,ttl}
`;

export async function consumeDistributedLimit(
 namespace:string,
 identity:string,
 limit:number,
 windowMs:number
){
 const redis=await getRedis();
 if(!redis)return null;

 const key="rl:"+namespace+":"+securityDigest(identity);
 const result=await redis.eval(SCRIPT,{
  keys:[key],
  arguments:[String(windowMs)]
 }) as [number,number];

 const count=Number(result[0]??0);
 const ttl=Number(result[1]??windowMs);

 return {
  allowed:count<=limit,
  remaining:Math.max(0,limit-count),
  retryAfterSeconds:Math.max(1,Math.ceil(ttl/1000))
 };
}
