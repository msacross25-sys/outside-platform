import {timingSafeEqual} from "node:crypto";

export function pushWorkerReady(){
 const secret=process.env.PUSH_WORKER_SECRET??"";
 return secret.length>=32;
}

export function authorizedPushWorker(request:Request){
 const expected=process.env.PUSH_WORKER_SECRET??"";
 if(expected.length<32)return false;
 const header=request.headers.get("authorization")??"";
 const token=header.startsWith("Bearer ")?header.slice(7):"";
 if(!token)return false;
 const a=Buffer.from(token);
 const b=Buffer.from(expected);
 return a.length===b.length&&timingSafeEqual(a,b);
}

export function pushRetryDelayMs(attempts:number){
 const schedule=[
  60_000,
  5*60_000,
  15*60_000,
  60*60_000,
  6*60*60_000
 ];
 return schedule[Math.min(Math.max(0,attempts-1),schedule.length-1)];
}

export function webPushReady(){
 if(process.env.WEB_PUSH_TEST_MODE==="true")return true;
 return Boolean(
  process.env.WEB_PUSH_VAPID_PUBLIC_KEY&&
  process.env.WEB_PUSH_VAPID_PRIVATE_KEY&&
  process.env.WEB_PUSH_SUBJECT&&
  process.env.PUSH_ENCRYPTION_KEY
 );
}
