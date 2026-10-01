import {createClient,type RedisClientType} from "redis";

type GlobalRedis=typeof globalThis&{
 __outsideRedisClient?:RedisClientType;
 __outsideRedisConnect?:Promise<RedisClientType|null>;
};

const g=globalThis as GlobalRedis;

export function redisConfigured(){
 return Boolean(process.env.REDIS_URL);
}

export async function getRedis():Promise<RedisClientType|null>{
 const url=process.env.REDIS_URL;
 if(!url)return null;

 if(g.__outsideRedisClient?.isReady)return g.__outsideRedisClient;
 if(g.__outsideRedisConnect)return g.__outsideRedisConnect;

 const client=createClient({
  url,
  socket:{
   connectTimeout:3000,
   reconnectStrategy:retries=>Math.min(1000,50*2**Math.min(retries,5))
  }
 });

 client.on("error",error=>{
  console.error("Redis client error",error instanceof Error?error.message:String(error));
 });

 g.__outsideRedisClient=client;
 g.__outsideRedisConnect=client.connect()
  .then(()=>client)
  .catch(error=>{
   console.error("Redis connection failed",error instanceof Error?error.message:String(error));
   try{client.destroy()}catch{}
   if(g.__outsideRedisClient===client)g.__outsideRedisClient=undefined;
   return null;
  })
  .finally(()=>{
   g.__outsideRedisConnect=undefined;
  });

 return g.__outsideRedisConnect;
}

export async function redisHealth(){
 const client=await getRedis();
 if(!client)return false;
 try{
  return await client.ping()==="PONG";
 }catch{
  return false;
 }
}
