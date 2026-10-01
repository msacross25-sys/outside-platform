import {getRedis} from "@/lib/redis";

function key(roomId:string){
 return "live:reaction-count:"+roomId;
}

export async function resetLiveReactionCount(roomId:string){
 const redis=await getRedis();
 if(!redis)return false;
 await redis.set(key(roomId),"0",{EX:172800});
 return true;
}

export async function incrementLiveReactionCount(roomId:string){
 const redis=await getRedis();
 if(!redis)return null;
 const value=await redis.incr(key(roomId));
 if(value===1)await redis.expire(key(roomId),172800);
 return value;
}

export async function readLiveReactionCount(roomId:string){
 const redis=await getRedis();
 if(!redis)return null;
 const value=await redis.get(key(roomId));
 return value===null?0:Number(value);
}

export async function clearLiveReactionCount(roomId:string){
 const redis=await getRedis();
 if(!redis)return;
 await redis.del(key(roomId));
}
