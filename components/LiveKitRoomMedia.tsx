"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {
 Room,
 RoomEvent,
 Track,
 type RemoteParticipant
} from "livekit-client";
import {LiveEffects} from "@/components/LiveEffects";
import {canPublishLiveMedia} from "@/lib/liveMedia";

type Member={userId:string;role:string;user:{id:string;username:string;displayName:string}};
type Props={slug:string;roomType:"VIDEO"|"VOICE";status:string;meId:string;initialMembers:Member[];myRole:string|null};

function RemoteMedia({
 participant,
 roomType,
 filter,
 version
}:{
 participant:RemoteParticipant;
 roomType:"VIDEO"|"VOICE";
 filter:string;
 version:number;
}){
 const holder=useRef<HTMLDivElement>(null);

 useEffect(()=>{
  const root=holder.current;
  if(!root)return;

  root.replaceChildren();
  const attached:{track:any;element:HTMLMediaElement}[]=[];

  for(const publication of participant.trackPublications.values()){
   const track=publication.track;
   if(!track)continue;
   if(roomType==="VOICE"&&track.kind!==Track.Kind.Audio)continue;

   const element=track.attach();
   element.autoplay=true;

   if(element instanceof HTMLVideoElement){
    element.playsInline=true;
    element.style.width="100%";
    element.style.maxWidth="520px";
    element.style.borderRadius="16px";
    element.style.filter=filter;
   }

   root.appendChild(element);
   attached.push({track,element});
  }

  return()=>{
   for(const item of attached){
    try{item.track.detach(item.element)}catch{}
    item.element.remove();
   }
  };
 },[participant,roomType,filter,version]);

 return <div>
  <b>{participant.name||participant.identity}</b>
  <div ref={holder}/>
 </div>;
}

export function LiveKitRoomMedia({slug,roomType,status,meId,initialMembers,myRole}:Props){
 const [members]=useState(initialMembers);
 const [roleState,setRoleState]=useState(myRole);
 const [joined,setJoined]=useState(!!initialMembers.find(x=>x.userId===meId));
 const [connected,setConnected]=useState(false);
 const [message,setMessage]=useState("");
 const [mic,setMic]=useState(false);
 const [camera,setCamera]=useState(false);
 const [filter,setFilter]=useState("none");
 const [activeEffect,setActiveEffect]=useState<any>(null);
 const [remoteParticipants,setRemoteParticipants]=useState<RemoteParticipant[]>([]);
 const [trackVersion,setTrackVersion]=useState(0);
 const localVideo=useRef<HTMLVideoElement>(null);
 const roomRef=useRef<Room|null>(null);

 const liveRole=roleState??members.find(x=>x.userId===meId)?.role??myRole;
 const publish=canPublishLiveMedia(liveRole);

 const refreshRemote=useCallback((room:Room)=>{
  setRemoteParticipants(Array.from(room.remoteParticipants.values()));
  setTrackVersion(v=>v+1);
 },[]);

 const join=useCallback(async()=>{
  const response=await fetch(`/api/porch/${slug}/join`,{method:"POST"});
  const data=await response.json().catch(()=>null);
  if(!response.ok){
   setMessage(data?.error??"Unable to join live room.");
   return false;
  }
  setJoined(true);
  return true;
 },[slug]);

 const checkAccess=useCallback(async()=>{
  const response=await fetch(`/api/porch/${slug}/access`,{cache:"no-store"});
  if(!response.ok){
   if(response.status===403||response.status===404){
    setJoined(false);
    setConnected(false);
    setMessage("You no longer have access to this Live.");
    roomRef.current?.disconnect();
    roomRef.current=null;
   }
   return;
  }
  const data=await response.json();
  setRoleState(data.role??"LISTENER");
 },[slug]);

 useEffect(()=>{
  if(status!=="LIVE")return;
  let active=true;

  void join().then(ok=>{
   if(ok&&active)void checkAccess();
  });

  const timer=window.setInterval(()=>void checkAccess(),10000);

  return()=>{
   active=false;
   clearInterval(timer);
   fetch(`/api/porch/${slug}/disconnect`,{method:"POST",keepalive:true}).catch(()=>{});
  };
 },[status,join,checkAccess,slug]);

 useEffect(()=>{
  if(status!=="LIVE"||!joined)return;
  let cancelled=false;
  const room=new Room({
   adaptiveStream:true,
   dynacast:true,
   disconnectOnPageLeave:true
  });
  roomRef.current=room;

  const refresh=()=>refreshRemote(room);
  const disconnected=()=>{
   if(cancelled)return;
   setConnected(false);
   setRemoteParticipants([]);
  };

  room.on(RoomEvent.ParticipantConnected,refresh);
  room.on(RoomEvent.ParticipantDisconnected,refresh);
  room.on(RoomEvent.TrackSubscribed,refresh);
  room.on(RoomEvent.TrackUnsubscribed,refresh);
  room.on(RoomEvent.ParticipantPermissionsChanged,refresh);
  room.on(RoomEvent.Disconnected,disconnected);

  void (async()=>{
   try{
    setMessage("Connecting secure Live media…");
    const tokenResponse=await fetch(`/api/porch/${slug}/livekit-token`,{method:"POST",cache:"no-store"});
    const tokenData=await tokenResponse.json().catch(()=>null);
    if(!tokenResponse.ok)throw new Error(tokenData?.error??"Live media is unavailable.");

    await room.connect(tokenData.serverUrl,tokenData.token,{autoSubscribe:true});
    if(cancelled){
     room.disconnect();
     return;
    }

    setConnected(true);
    setMessage("");
    refreshRemote(room);

    if(tokenData.canPublish){
     await room.localParticipant.setMicrophoneEnabled(true);
     setMic(true);

     if(roomType==="VIDEO"){
      await room.localParticipant.setCameraEnabled(true);
      setCamera(true);
      const publication=room.localParticipant.getTrackPublication(Track.Source.Camera);
      const track=publication?.track;
      if(track&&localVideo.current){
       track.attach(localVideo.current);
       localVideo.current.muted=true;
       await localVideo.current.play().catch(()=>{});
      }
     }
    }else{
     setMic(false);
     setCamera(false);
    }
   }catch(error){
    if(cancelled)return;
    setConnected(false);
    setMessage(error instanceof Error?error.message:"Live media connection failed.");
   }
  })();

  return()=>{
   cancelled=true;
   if(localVideo.current)localVideo.current.srcObject=null;
   room.removeAllListeners();
   room.disconnect();
   if(roomRef.current===room)roomRef.current=null;
   setConnected(false);
   setRemoteParticipants([]);
   setMic(false);
   setCamera(false);
  };
 },[status,joined,slug,roomType,liveRole,refreshRemote]);

 async function toggleMic(){
  const room=roomRef.current;
  if(!room||!publish)return;
  try{
   const next=!mic;
   await room.localParticipant.setMicrophoneEnabled(next);
   setMic(next);
  }catch{
   setMessage("Microphone could not be updated.");
  }
 }

 async function toggleCamera(){
  const room=roomRef.current;
  if(!room||!publish||roomType!=="VIDEO")return;
  try{
   const next=!camera;
   await room.localParticipant.setCameraEnabled(next);
   setCamera(next);
   if(next){
    const publication=room.localParticipant.getTrackPublication(Track.Source.Camera);
    const track=publication?.track;
    if(track&&localVideo.current){
     track.attach(localVideo.current);
     localVideo.current.muted=true;
     await localVideo.current.play().catch(()=>{});
    }
   }
  }catch{
   setMessage("Camera could not be updated.");
  }
 }

 if(status!=="LIVE"){
  return <section className="featureCard"><span className="eyebrow">Live Media</span><p>Media controls appear when the room goes live.</p></section>;
 }

 return <>
  <section className="featureCard">
   <span className="eyebrow">LIVE {roomType} · SFU</span>
   <h2>{connected?"Connected":"Connecting…"}</h2>

   {publish&&<div>
    <label>Lens / Filter
     <select value={filter} onChange={e=>setFilter(e.target.value)}>
      <option value="none">Natural</option>
      <option value="brightness(1.12) saturate(1.15)">Bright</option>
      <option value="contrast(1.12) saturate(1.2)">Pop</option>
      <option value="grayscale(.8) contrast(1.08)">Mono</option>
      <option value="sepia(.35) saturate(1.15)">Warm</option>
     </select>
    </label>

    {roomType==="VIDEO"&&<video
     ref={localVideo}
     autoPlay
     playsInline
     muted
     style={{width:"100%",maxWidth:520,borderRadius:16,filter}}
    />}

    <div>
     <button type="button" onClick={toggleMic}>{mic?"Mute mic":"Unmute mic"}</button>
     {roomType==="VIDEO"&&<button type="button" onClick={toggleCamera}>{camera?"Camera off":"Camera on"}</button>}
    </div>
   </div>}

   <div>
    {remoteParticipants.map(participant=>
     <RemoteMedia
      key={participant.identity}
      participant={participant}
      roomType={roomType}
      filter={filter}
      version={trackVersion}
     />
    )}
   </div>

   {message&&<p>{message}</p>}
  </section>

  {joined&&<LiveEffects
   slug={slug}
   host={liveRole==="HOST"}
   onApply={effect=>{
    setActiveEffect(effect);
    setFilter(effect?.css??"none");
   }}
  />}
  {activeEffect&&<p>Active effect: {activeEffect.name}</p>}
 </>;
}
