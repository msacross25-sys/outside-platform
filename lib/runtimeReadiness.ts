import {db} from "@/lib/db";
import {mediaStorageReady} from "@/lib/mediaStorage";
import {livekitEnabled,liveMediaProvider} from "@/lib/livekit";
import {liveRecordingMode,liveRecordingReady,liveRecordingTestMode} from "@/lib/liveRecording";

export type ReadinessCheck={
 ok:boolean;
 message?:string;
};

export type RuntimeReadiness={
 ready:boolean;
 release:string|null;
 checks:{
  database:ReadinessCheck;
  securitySchema:ReadinessCheck;
  authConfig:ReadinessCheck;
  email:ReadinessCheck;
  media:ReadinessCheck;
  liveTransport:ReadinessCheck;
  liveRecording:ReadinessCheck;
  clipProcessing:ReadinessCheck;
  appUrl:ReadinessCheck;
 };
};

function releaseId(){
 return process.env.OUTSIDE_RELEASE
  ||process.env.VERCEL_GIT_COMMIT_SHA
  ||process.env.GITHUB_SHA
  ||process.env.RENDER_GIT_COMMIT
  ||process.env.RAILWAY_GIT_COMMIT_SHA
  ||null;
}

function validMfaKey(value:string|undefined){
 if(!value)return false;
 if(/^[0-9a-f]{64}$/i.test(value))return true;
 try{
  return Buffer.from(value,"base64").length===32;
 }catch{
  return false;
 }
}

function appUrlCheck(strict:boolean):ReadinessCheck{
 const raw=process.env.NEXT_PUBLIC_APP_URL;
 if(!raw)return {ok:false,message:"NEXT_PUBLIC_APP_URL is missing."};
 try{
  const url=new URL(raw);
  if(strict&&url.protocol!=="https:")return {ok:false,message:"Production app URL must use HTTPS."};
  return {ok:true};
 }catch{
  return {ok:false,message:"NEXT_PUBLIC_APP_URL is invalid."};
 }
}

function authConfigCheck():ReadinessCheck{
 const secret=process.env.AUTH_SECRET??"";
 if(secret.length<32)return {ok:false,message:"AUTH_SECRET must be at least 32 characters."};
 if(!validMfaKey(process.env.MFA_ENCRYPTION_KEY))return {ok:false,message:"MFA encryption key is missing or invalid."};
 return {ok:true};
}

function emailCheck(strict:boolean):ReadinessCheck{
 const mode=(process.env.EMAIL_DELIVERY_MODE??"").toLowerCase();
 if(!strict&&mode==="test")return {ok:true};
 if(mode!=="resend")return {ok:false,message:"Production email delivery must use the configured transactional provider."};
 if(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM)return {ok:false,message:"Transactional email credentials are incomplete."};
 return {ok:true};
}

function mediaCheck(strict:boolean):ReadinessCheck{
 if(!strict&&process.env.MEDIA_STORAGE_MODE==="test"&&process.env.ALLOW_TEST_MEDIA_STORAGE==="true")return {ok:true};
 if(process.env.MEDIA_STORAGE_MODE!=="s3")return {ok:false,message:"Production media storage must use the private S3-compatible provider mode."};
 if(!mediaStorageReady())return {ok:false,message:"Private media storage credentials are incomplete."};
 if(!process.env.MEDIA_SIGNING_SECRET||process.env.MEDIA_SIGNING_SECRET.length<32){
  return {ok:false,message:"MEDIA_SIGNING_SECRET must be at least 32 characters."};
 }
 return {ok:true};
}


function liveTransportCheck(strict:boolean):ReadinessCheck{
 if(!strict&&process.env.LIVEKIT_TEST_MODE==="true"&&liveMediaProvider()==="livekit")return {ok:true};
 if(liveMediaProvider()!=="livekit")return {ok:false,message:"Production Live transport must use the configured SFU provider."};
 if(!livekitEnabled())return {ok:false,message:"LiveKit URL or server credentials are incomplete."};
 try{
  const url=new URL(process.env.LIVEKIT_URL??"");
  if(strict&&url.protocol!=="wss:")return {ok:false,message:"Production LiveKit client URL must use WSS."};
 }catch{
  return {ok:false,message:"LIVEKIT_URL is invalid."};
 }
 return {ok:true};
}


function liveRecordingCheck(strict:boolean):ReadinessCheck{
 if(!strict&&liveRecordingTestMode()&&liveRecordingMode()==="livekit")return {ok:true};
 if(liveRecordingMode()!=="livekit")return {ok:false,message:"Production replay recording must use LiveKit egress."};
 if(!liveRecordingReady())return {ok:false,message:"Live replay recording or private storage configuration is incomplete."};
 return {ok:true};
}

function clipProcessingCheck(strict:boolean):ReadinessCheck{
 if(!strict&&process.env.MEDIA_TRANSCODING_TEST_MODE==="true"&&clipProcessingMode()==="external")return {ok:true};
 if(clipProcessingMode()!=="external")return {ok:false,message:"Production clip processing must use the configured transcoding service."};
 if(!clipProcessingReady())return {ok:false,message:"Clip transcoding service URL or callback signing secret is incomplete."};
 if((process.env.MEDIA_PROCESSING_SIGNING_SECRET??"").length<32){
  return {ok:false,message:"MEDIA_PROCESSING_SIGNING_SECRET must be at least 32 characters."};
 }
 return {ok:true};
}

async function databaseCheck():Promise<ReadinessCheck>{
 try{
  await db.$queryRaw`SELECT 1`;
  return {ok:true};
 }catch{
  return {ok:false,message:"Database connection failed."};
 }
}

async function securitySchemaCheck():Promise<ReadinessCheck>{
 try{
  await Promise.all([
   db.authToken.findFirst({select:{id:true}}),
   db.authRateLimit.findFirst({select:{keyHash:true}}),
   db.mfaCredential.findFirst({select:{userId:true}}),
   db.authEvent.findFirst({select:{id:true}})
  ]);
  return {ok:true};
 }catch{
  return {ok:false,message:"Required account-security schema is unavailable."};
 }
}

export async function runtimeReadiness():Promise<RuntimeReadiness>{
 const strict=process.env.READINESS_MODE!=="test";
 const [database,securitySchema]=await Promise.all([
  databaseCheck(),
  securitySchemaCheck()
 ]);

 const checks={
  database,
  securitySchema,
  authConfig:authConfigCheck(),
  email:emailCheck(strict),
  media:mediaCheck(strict),
  liveTransport:liveTransportCheck(strict),
  liveRecording:liveRecordingCheck(strict),
  clipProcessing:clipProcessingCheck(strict),
  appUrl:appUrlCheck(strict)
 };

 return {
  ready:Object.values(checks).every(check=>check.ok),
  release:releaseId(),
  checks
 };
}
