import {EgressClient,EncodedFileOutput,S3Upload} from "livekit-server-sdk";
import {WebhookConfig} from "@livekit/protocol";
import {livekitApiUrl,livekitCredentials,livekitRoomName} from "@/lib/livekit";

export function liveRecordingMode(){
 const value=(process.env.LIVE_RECORDING_MODE||"disabled").toLowerCase();
 return value==="livekit"?"livekit":"disabled";
}

export function liveRecordingTestMode(){
 return process.env.LIVE_RECORDING_TEST_MODE==="true";
}

export function liveRecordingReady(){
 if(liveRecordingMode()!=="livekit")return false;
 if(liveRecordingTestMode())return true;
 return Boolean(
  process.env.LIVEKIT_URL&&
  process.env.LIVEKIT_API_KEY&&
  process.env.LIVEKIT_API_SECRET&&
  process.env.NEXT_PUBLIC_APP_URL&&
  process.env.MEDIA_S3_ENDPOINT&&
  process.env.MEDIA_S3_BUCKET&&
  process.env.MEDIA_S3_ACCESS_KEY_ID&&
  process.env.MEDIA_S3_SECRET_ACCESS_KEY
 );
}

export function replayObjectKey(roomId:string){
 return "replays/"+roomId+"/full.mp4";
}

export function replayMediaPath(slug:string){
 return "/api/porch/"+encodeURIComponent(slug)+"/replay-media";
}

function webhookUrl(){
 const base=process.env.NEXT_PUBLIC_APP_URL;
 if(!base)throw new Error("NEXT_PUBLIC_APP_URL is not configured.");
 return new URL("/api/webhooks/livekit",base).toString();
}

function egressClient(){
 const {apiKey,apiSecret}=livekitCredentials();
 return new EgressClient(livekitApiUrl(),apiKey,apiSecret);
}

function output(roomId:string){
 const endpoint=process.env.MEDIA_S3_ENDPOINT;
 const bucket=process.env.MEDIA_S3_BUCKET;
 const accessKey=process.env.MEDIA_S3_ACCESS_KEY_ID;
 const secret=process.env.MEDIA_S3_SECRET_ACCESS_KEY;
 if(!endpoint||!bucket||!accessKey||!secret){
  throw new Error("Replay recording storage is not configured.");
 }

 return new EncodedFileOutput({
  filepath:replayObjectKey(roomId),
  output:{
   case:"s3",
   value:new S3Upload({
    accessKey,
    secret,
    sessionToken:process.env.MEDIA_S3_SESSION_TOKEN||"",
    region:process.env.MEDIA_S3_REGION||"auto",
    endpoint,
    bucket,
    forcePathStyle:true
   })
  }
 });
}

export async function startLiveRecording(roomId:string,roomType:"VIDEO"|"VOICE"){
 if(liveRecordingMode()!=="livekit")return null;
 if(liveRecordingTestMode()){
  return {egressId:"test-egress-"+roomId};
 }
 if(!liveRecordingReady())throw new Error("Live recording is not configured.");

 const {apiKey}=livekitCredentials();

 return egressClient().startRoomCompositeEgress(
  livekitRoomName(roomId),
  {file:output(roomId)},
  {
   audioOnly:roomType==="VOICE",
   webhooks:[
    new WebhookConfig({
     url:webhookUrl(),
     signingKey:apiKey
    })
   ]
  }
 );
}

export async function stopLiveRecording(roomId:string){
 if(liveRecordingMode()!=="livekit")return [];
 if(liveRecordingTestMode())return [];
 if(!liveRecordingReady())throw new Error("Live recording is not configured.");

 const client=egressClient();
 const active=await client.listEgress({
  roomName:livekitRoomName(roomId),
  active:true
 });
 const results=[];
 for(const item of active){
  results.push(await client.stopEgress(item.egressId));
 }
 return results;
}
