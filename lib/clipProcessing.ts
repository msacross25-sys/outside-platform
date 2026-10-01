import {timingSafeEqual} from "node:crypto";

export function clipObjectKey(clipId:string){
 return "clips/"+clipId+"/clip.mp4";
}

export function clipMediaPath(clipId:string){
 return "/api/clips/"+encodeURIComponent(clipId)+"/media";
}

export function clipWorkerReady(){
 const secret=process.env.CLIP_WORKER_SECRET??"";
 return secret.length>=32;
}

export function authorizedClipWorker(request:Request){
 const expected=process.env.CLIP_WORKER_SECRET??"";
 if(expected.length<32)return false;
 const header=request.headers.get("authorization")??"";
 const token=header.startsWith("Bearer ")?header.slice(7):"";
 if(!token)return false;
 const a=Buffer.from(token);
 const b=Buffer.from(expected);
 return a.length===b.length&&timingSafeEqual(a,b);
}
