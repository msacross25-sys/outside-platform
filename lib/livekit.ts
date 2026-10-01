import {AccessToken,RoomServiceClient} from "livekit-server-sdk";
import {DataPacket_Kind} from "@livekit/protocol";
import {canPublishPorchRole} from "@/lib/porchAccess";

type TokenArgs={
 roomId:string;
 userId:string;
 displayName:string;
 role:string|null|undefined;
};

export function liveMediaProvider(){
 const value=(process.env.LIVE_MEDIA_PROVIDER||"mesh").toLowerCase();
 return value==="livekit"?"livekit":"mesh";
}

export function livekitEnabled(){
 if(liveMediaProvider()!=="livekit")return false;
 if(process.env.LIVEKIT_TEST_MODE==="true")return true;
 return Boolean(process.env.LIVEKIT_URL&&process.env.LIVEKIT_API_KEY&&process.env.LIVEKIT_API_SECRET);
}

export function livekitRoomName(roomId:string){
 return "outside_"+roomId;
}

export function roomIdFromLivekitRoomName(roomName:string){
 return roomName.startsWith("outside_")?roomName.slice("outside_".length):null;
}

function clientUrl(){
 const value=process.env.LIVEKIT_URL;
 if(!value)throw new Error("LIVEKIT_URL is not configured.");
 return value;
}

export function livekitApiUrl(){
 const value=clientUrl();
 const url=new URL(value);
 if(url.protocol==="wss:")url.protocol="https:";
 if(url.protocol==="ws:")url.protocol="http:";
 return url.toString().replace(/\/$/,"");
}

export function livekitCredentials(){
 const apiKey=process.env.LIVEKIT_API_KEY;
 const apiSecret=process.env.LIVEKIT_API_SECRET;
 if(!apiKey||!apiSecret)throw new Error("LiveKit server credentials are not configured.");
 return {apiKey,apiSecret};
}

function service(){
 const {apiKey,apiSecret}=livekitCredentials();
 return new RoomServiceClient(livekitApiUrl(),apiKey,apiSecret);
}

export async function issueLivekitToken(args:TokenArgs){
 const canPublish=canPublishPorchRole(args.role);

 if(process.env.LIVEKIT_TEST_MODE==="true"){
  return {
   serverUrl:process.env.LIVEKIT_URL||"wss://livekit.example.test",
   token:"test-livekit-token-"+args.userId,
   roomName:livekitRoomName(args.roomId),
   canPublish,
   canSubscribe:true
  };
 }

 if(!livekitEnabled())throw new Error("LiveKit is not configured.");

 const {apiKey,apiSecret}=livekitCredentials();
 const roomName=livekitRoomName(args.roomId);
 const token=new AccessToken(apiKey,apiSecret,{
  identity:args.userId,
  name:args.displayName,
  ttl:"10m",
  metadata:JSON.stringify({role:args.role??"LISTENER"})
 });
 token.addGrant({
  roomJoin:true,
  room:roomName,
  canPublish,
  canSubscribe:true,
  canPublishData:false
 });

 return {
  serverUrl:clientUrl(),
  token:await token.toJwt(),
  roomName,
  canPublish,
  canSubscribe:true
 };
}

export async function ensureLivekitRoom(roomId:string,metadata:Record<string,unknown>={}){
 if(!livekitEnabled())return;
 if(process.env.LIVEKIT_TEST_MODE==="true")return;

 const roomName=livekitRoomName(roomId);
 const api=service();
 const existing=await api.listRooms([roomName]);
 if(existing.length)return;

 await api.createRoom({
  name:roomName,
  emptyTimeout:10*60,
  departureTimeout:30,
  metadata:JSON.stringify(metadata)
 });
}

export async function deleteLivekitRoom(roomId:string){
 if(!livekitEnabled())return;
 if(process.env.LIVEKIT_TEST_MODE==="true")return;
 try{
  await service().deleteRoom(livekitRoomName(roomId));
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  if(!/not found|does not exist/i.test(message))throw error;
 }
}

export async function syncLivekitParticipantRole(roomId:string,userId:string,role:string|null|undefined){
 if(!livekitEnabled())return;
 if(process.env.LIVEKIT_TEST_MODE==="true")return;

 const canPublish=canPublishPorchRole(role);
 try{
  await service().updateParticipant(livekitRoomName(roomId),userId,{
   metadata:JSON.stringify({role:role??"LISTENER"}),
   permission:{
    canSubscribe:true,
    canPublish,
    canPublishData:false
   }
  });
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  if(!/not found|does not exist/i.test(message))throw error;
 }
}

export async function removeLivekitParticipant(roomId:string,userId:string){
 if(!livekitEnabled())return;
 if(process.env.LIVEKIT_TEST_MODE==="true")return;
 try{
  await service().removeParticipant(livekitRoomName(roomId),userId);
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  if(!/not found|does not exist/i.test(message))throw error;
 }
}

export async function broadcastLivekitData(roomId:string,topic:string,payload:unknown){
 if(!livekitEnabled())return;
 if(process.env.LIVEKIT_TEST_MODE==="true")return;
 const data=new TextEncoder().encode(JSON.stringify(payload));
 await service().sendData(
  livekitRoomName(roomId),
  data,
  DataPacket_Kind.RELIABLE,
  {topic}
 );
}
