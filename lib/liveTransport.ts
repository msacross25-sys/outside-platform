import {AccessToken,LiveKitAPI,ServerError} from "livekit-server-sdk";
import {canPublishPorchRole} from "@/lib/porchAccess";
import {logError,logWarn} from "@/lib/logger";

export type LiveMediaMode="mesh"|"livekit";

export function liveMediaMode():LiveMediaMode{
 return process.env.LIVE_MEDIA_MODE==="livekit"?"livekit":"mesh";
}

export function liveKitConfigured(){
 return Boolean(
  process.env.LIVEKIT_URL&&
  process.env.LIVEKIT_API_KEY&&
  process.env.LIVEKIT_API_SECRET
 );
}

function config(){
 const url=process.env.LIVEKIT_URL;
 const apiKey=process.env.LIVEKIT_API_KEY;
 const apiSecret=process.env.LIVEKIT_API_SECRET;
 if(!url||!apiKey||!apiSecret)throw new Error("LiveKit is not configured.");
 return {url,apiKey,apiSecret};
}

export function liveKitRoomName(roomId:string){
 return "outside_"+roomId;
}

function apiHost(wsUrl:string){
 const url=new URL(wsUrl);
 if(url.protocol==="wss:")url.protocol="https:";
 else if(url.protocol==="ws:")url.protocol="http:";
 return url.toString().replace(/\/$/,"");
}

function api(){
 const cfg=config();
 return new LiveKitAPI({
  host:apiHost(cfg.url),
  apiKey:cfg.apiKey,
  secret:cfg.apiSecret
 });
}

export async function createLiveKitSession(input:{
 roomId:string;
 userId:string;
 role:string|null|undefined;
}){
 const cfg=config();
 const canPublish=canPublishPorchRole(input.role);
 const roomName=liveKitRoomName(input.roomId);
 const token=new AccessToken(cfg.apiKey,cfg.apiSecret,{
  identity:input.userId,
  ttl:"5m",
  metadata:JSON.stringify({role:input.role??"LISTENER"})
 });
 token.addGrant({
  roomJoin:true,
  room:roomName,
  canSubscribe:true,
  canPublish,
  canPublishData:false
 });
 return {
  mode:"livekit" as const,
  serverUrl:cfg.url,
  token:await token.toJwt(),
  canPublish,
  roomName
 };
}

export async function syncLiveKitPublishPermission(input:{
 roomId:string;
 userId:string;
 role:string|null|undefined;
}){
 if(liveMediaMode()!=="livekit"||!liveKitConfigured())return;
 try{
  await api().room.updateParticipant(
   liveKitRoomName(input.roomId),
   input.userId,
   {
    permission:{
     canSubscribe:true,
     canPublish:canPublishPorchRole(input.role),
     canPublishData:false
    },
    metadata:JSON.stringify({role:input.role??"LISTENER"})
   }
  );
 }catch(error){
  if(error instanceof ServerError&&error.code==="not_found")return;
  logWarn("livekit_permission_sync_failed",{
   roomId:input.roomId,
   userId:input.userId,
   error:error instanceof Error?error.message:String(error)
  });
 }
}

export async function removeLiveKitParticipant(input:{
 roomId:string;
 userId:string;
}){
 if(liveMediaMode()!=="livekit"||!liveKitConfigured())return;
 try{
  await api().room.removeParticipant(
   liveKitRoomName(input.roomId),
   input.userId,
   {revokeTokenTs:BigInt(Math.floor(Date.now()/1000))}
  );
 }catch(error){
  if(error instanceof ServerError&&error.code==="not_found")return;
  logError("livekit_participant_remove_failed",error,{
   roomId:input.roomId,
   userId:input.userId
  });
 }
}
