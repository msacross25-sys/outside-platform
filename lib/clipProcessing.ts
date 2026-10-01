import {createHmac,timingSafeEqual} from "node:crypto";
import {
 createSignedMediaDownload,
 createSignedStorageUpload,
 statStoredMedia
} from "@/lib/mediaStorage";
import {replayObjectKey} from "@/lib/liveRecording";

export type ClipJob={
 clipId:string;
 roomId:string;
 startSeconds:number;
 endSeconds:number;
};

export function clipProcessingMode(){
 const value=(process.env.MEDIA_TRANSCODING_MODE||"disabled").toLowerCase();
 return value==="external"?"external":"disabled";
}

export function clipProcessingTestMode(){
 return process.env.MEDIA_TRANSCODING_TEST_MODE==="true";
}

function signingSecret(){
 const value=process.env.MEDIA_PROCESSING_SIGNING_SECRET;
 if(!value)throw new Error("MEDIA_PROCESSING_SIGNING_SECRET is not configured.");
 return value;
}

export function clipProcessingReady(){
 if(clipProcessingMode()!=="external")return false;
 if(clipProcessingTestMode())return true;
 return Boolean(
  process.env.MEDIA_TRANSCODING_SERVICE_URL&&
  process.env.MEDIA_PROCESSING_SIGNING_SECRET&&
  process.env.NEXT_PUBLIC_APP_URL
 );
}

export function clipObjectKey(clipId:string){
 return "clips/"+clipId+"/clip.mp4";
}

export function clipMediaPath(clipId:string){
 return "/api/clips/"+encodeURIComponent(clipId)+"/media";
}

function hmac(body:string){
 return createHmac("sha256",signingSecret()).update(body).digest("hex");
}

export function signedProcessorHeaders(body:string){
 return {
  "content-type":"application/json",
  "x-outside-signature":"sha256="+hmac(body)
 };
}

export function verifyProcessorSignature(body:string,header:string|null){
 if(!header?.startsWith("sha256="))return false;
 const supplied=header.slice("sha256=".length);
 const expected=hmac(body);
 const a=Buffer.from(supplied,"hex");
 const b=Buffer.from(expected,"hex");
 return a.length===b.length&&timingSafeEqual(a,b);
}

function callbackUrl(){
 const base=process.env.NEXT_PUBLIC_APP_URL;
 if(!base)throw new Error("NEXT_PUBLIC_APP_URL is not configured.");
 return new URL("/api/webhooks/media/clip",base).toString();
}

export async function queueClipProcessing(job:ClipJob){
 if(clipProcessingMode()!=="external")throw new Error("Clip processing is disabled.");
 if(clipProcessingTestMode()){
  return {queued:true,ready:true};
 }
 if(!clipProcessingReady())throw new Error("Clip processing is not configured.");

 const serviceUrl=process.env.MEDIA_TRANSCODING_SERVICE_URL!;
 const sourceUrl=createSignedMediaDownload(
  replayObjectKey(job.roomId),
  {expiresInSeconds:1800}
 );
 const output=createSignedStorageUpload(
  clipObjectKey(job.clipId),
  "video/mp4",
  1800
 );

 const payload={
  version:1,
  jobType:"CLIP",
  clipId:job.clipId,
  source:{
   url:sourceUrl,
   startSeconds:job.startSeconds,
   endSeconds:job.endSeconds
  },
  output:{
   uploadUrl:output.uploadUrl,
   headers:output.headers,
   contentType:"video/mp4",
   container:"mp4",
   videoCodec:"h264",
   audioCodec:"aac",
   fastStart:true
  },
  callbackUrl:callbackUrl()
 };

 const body=JSON.stringify(payload);
 const response=await fetch(serviceUrl,{
  method:"POST",
  headers:signedProcessorHeaders(body),
  body,
  signal:AbortSignal.timeout(15000),
  cache:"no-store"
 });

 if(!response.ok){
  throw new Error("Clip processor rejected the job with status "+response.status+".");
 }

 return {queued:true,ready:false};
}

export async function verifyProcessedClip(clipId:string){
 const stat=await statStoredMedia(clipObjectKey(clipId));
 if(!stat.exists||stat.size<=0)throw new Error("Processed clip output is missing.");
 if(stat.contentType&&stat.contentType!=="video/mp4"){
  throw new Error("Processed clip output has an unexpected content type.");
 }
 return stat;
}
