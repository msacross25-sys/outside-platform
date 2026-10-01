const required=[
 "DATABASE_URL",
 "DIRECT_URL",
 "AUTH_SECRET",
 "MFA_ENCRYPTION_KEY",
 "NEXT_PUBLIC_APP_URL",
 "RESEND_API_KEY",
 "EMAIL_FROM",
 "MEDIA_SIGNING_SECRET",
 "MEDIA_S3_ENDPOINT",
 "MEDIA_S3_BUCKET",
 "MEDIA_S3_ACCESS_KEY_ID",
 "MEDIA_S3_SECRET_ACCESS_KEY",
 "LIVEKIT_URL",
 "LIVEKIT_API_KEY",
 "LIVEKIT_API_SECRET",
 "MEDIA_TRANSCODING_SERVICE_URL",
 "MEDIA_PROCESSING_SIGNING_SECRET"
];

const missing=required.filter(name=>!process.env[name]?.trim());
const errors=[];

if(missing.length)errors.push("Missing required environment variables: "+missing.join(", "));

const appUrl=process.env.NEXT_PUBLIC_APP_URL;
if(appUrl){
 try{
  const url=new URL(appUrl);
  if(url.protocol!=="https:")errors.push("NEXT_PUBLIC_APP_URL must use HTTPS in production.");
 }catch{
  errors.push("NEXT_PUBLIC_APP_URL is not a valid URL.");
 }
}

if((process.env.AUTH_SECRET??"").length<32){
 errors.push("AUTH_SECRET must be at least 32 characters.");
}

const mediaSecret=process.env.MEDIA_SIGNING_SECRET??"";
if(mediaSecret.length<32){
 errors.push("MEDIA_SIGNING_SECRET must be at least 32 characters.");
}

const mfa=process.env.MFA_ENCRYPTION_KEY??"";
let validMfa=/^[0-9a-f]{64}$/i.test(mfa);
if(!validMfa){
 try{validMfa=Buffer.from(mfa,"base64").length===32}catch{validMfa=false}
}
if(!validMfa)errors.push("MFA_ENCRYPTION_KEY must be 32 bytes as base64 or 64 hexadecimal characters.");

if((process.env.EMAIL_DELIVERY_MODE??"resend").toLowerCase()!=="resend"){
 errors.push("EMAIL_DELIVERY_MODE must be resend for production.");
}

if((process.env.MEDIA_STORAGE_MODE??"s3").toLowerCase()!=="s3"){
 errors.push("MEDIA_STORAGE_MODE must be s3 for production.");
}

if((process.env.LIVE_MEDIA_PROVIDER??"").toLowerCase()!=="livekit"){
 errors.push("LIVE_MEDIA_PROVIDER must be livekit for production.");
}

if((process.env.LIVE_RECORDING_MODE??"").toLowerCase()!=="livekit"){
 errors.push("LIVE_RECORDING_MODE must be livekit for production replay recording.");
}

if((process.env.MEDIA_TRANSCODING_MODE??"").toLowerCase()!=="external"){
 errors.push("MEDIA_TRANSCODING_MODE must be external for production clip processing.");
}

if((process.env.MEDIA_PROCESSING_SIGNING_SECRET??"").length<32){
 errors.push("MEDIA_PROCESSING_SIGNING_SECRET must be at least 32 characters.");
}

const livekitUrl=process.env.LIVEKIT_URL;
if(livekitUrl){
 try{
  const url=new URL(livekitUrl);
  if(url.protocol!=="wss:")errors.push("LIVEKIT_URL must use WSS in production.");
 }catch{
  errors.push("LIVEKIT_URL is not a valid URL.");
 }
}

if(errors.length){
 console.error("OUTSiiDE production preflight failed:");
 for(const error of errors)console.error("- "+error);
 process.exit(1);
}

console.log("OUTSiiDE production environment preflight passed.");
