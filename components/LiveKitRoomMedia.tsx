"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import {
 isBrowserSupported,
 Room,
 RoomEvent,
 Track,
 VideoPresets,
 type RemoteParticipant,
 type RemoteTrack,
 type RemoteTrackPublication
} from "livekit-client";
import {LiveEffects} from "@/components/LiveEffects";
import {canPublishLiveMedia} from "@/lib/liveMedia";

type Member={
 userId:string;
 role:string;
 user:{id:string;username:string;displayName:string};
};

type Props={
 slug:string;
 roomType:"VIDEO"|"VOICE";
 status:string;
 meId:string;
 initialMembers:Member[];
 myRole:string|null;
};

type RemoteMedia={
 id:string;
 participantId:string;
 track:RemoteTrack;
};

function RemoteVideo({track,filter}:{track:RemoteTrack;filter:string}){
 const ref=useRef<HTMLVideoElement>(null);
 useEffect(()=>{
  const el=ref.current;
  if(!el)return;
  track.attach(el);
  return()=>{track.detach(el)};
 },[track]);
 return <video ref={ref} autoPlay playsInline style={{width:"100%",maxWidth:520,borderRadius:16,filter}}/>;
}

function RemoteAudio({track}:{track:RemoteTrack}){
 const ref=useRef<HTMLAudioElement>(null);
 useEffect(()=>{
  const el=ref.current;
  if(!el)return;
  track.attach(el);
  return()=>{track.detach(el)};
 },[track]);
 return <audio ref={ref} autoPlay/>;
}

export function LiveKitRoomMedia({
 slug,
 roomType,
 status,
 meId,
 initialMembers,
 myRole
}:Props){
 const [members,setMembers]=useState(initialMembers);
 const [connected,setConnected]=useState(false);
 const [message,setMessage]=useState("");
 const [mic,setMic]=useState(false);
 const [camera,setCamera]=useState(false);
 const [filter,setFilter]=useState("none");
 const [activeEffect,setActiveEffect]=useState<any>(null);
 const [remoteMedia,setRemoteMedia]=useState<RemoteMedia[]>([]);
 const [audioBlocked,setAudioBlocked]=useState(false);
 const roomRef=useRef<Room|null>(null);
 const localVideo=useRef<HTMLVideoElement>(null);

 const liveRole=members.find(member=>member.userId===meId)?.role??myRole;
 const publish=canPublishLiveMedia(liveRole);

 const loadMembers=useCallback(async()=>{
  const response=await fetch(`/api/porch/${slug}/members`,{cache:"no-store"});
  if(response.ok){
   const data=await response.json();
   setMembers(data.members??[]);
  }
 },[slug]);

 const attachLocalCamera=useCallback(()=>{
  const room=roomRef.current;
  const element=localVideo.current;
  if(!room||!element)return;
  const publication=room.localParticipant.getTrackPublication(Track.Source.Camera);
  const track=publication?.track;
  if(track)track.attach(element);
 },[]);

 useEffect(()=>{
  if(status!=="LIVE")return;
  if(!isBrowserSupported()){
   setMessage("This browser cannot run OUTSiiDE Live media.");
   return;
  }

  let cancelled=false;
  let timer:number|undefined;
  const room=new Room({
   adaptiveStream:true,
   dynacast:true,
   disconnectOnPageLeave:true,
   videoCaptureDefaults:{resolution:VideoPresets.h720.resolution}
  });
  roomRef.current=room;

  const addTrack=(
   track:RemoteTrack,
   publication:RemoteTrackPublication,
   participant:RemoteParticipant
  )=>{
   if(track.kind!==Track.Kind.Video&&track.kind!==Track.Kind.Audio)return;
   setRemoteMedia(current=>{
    const next=current.filter(item=>item.id!==publication.trackSid);
    return [...next,{id:publication.trackSid,participantId:participant.identity,track}];
   });
  };

  const removeTrack=(track:RemoteTrack,publication:RemoteTrackPublication)=>{
   track.detach();
   setRemoteMedia(current=>current.filter(item=>item.id!==publication.trackSid));
  };

  const updateAudioState=()=>setAudioBlocked(!room.canPlaybackAudio);

  room.on(RoomEvent.TrackSubscribed,addTrack);
  room.on(RoomEvent.TrackUnsubscribed,removeTrack);
  room.on(RoomEvent.AudioPlaybackStatusChanged,updateAudioState);
  room.on(RoomEvent.Reconnecting,()=>setMessage("Live connection is reconnecting…"));
  room.on(RoomEvent.Reconnected,()=>setMessage(""));
  room.on(RoomEvent.Disconnected,()=>{
   if(!cancelled)setConnected(false);
  });
  room.on(RoomEvent.MediaDevicesError,()=>{
   setMessage("Camera or microphone access needs attention.");
  });

  const connect=async()=>{
   try{
    const join=await fetch(`/api/porch/${slug}/join`,{method:"POST"});
    if(!join.ok){
     const data=await join.json().catch(()=>null);
     throw new Error(data?.error??"Unable to join Live.");
    }

    await loadMembers();

    const response=await fetch(`/api/porch/${slug}/media-session`,{
     cache:"no-store"
    });
    const session=await response.json().catch(()=>null);
    if(!response.ok||session?.mode!=="livekit"){
     throw new Error(session?.error??"Live media service is unavailable.");
    }

    room.prepareConnection(session.serverUrl,session.token);
    await room.connect(session.serverUrl,session.token);
    if(cancelled){
     await room.disconnect();
     return;
    }

    setConnected(true);
    setAudioBlocked(!room.canPlaybackAudio);
    timer=window.setInterval(()=>{void loadMembers()},2500);
   }catch(error){
    if(!cancelled){
     setMessage(error instanceof Error?error.message:"Unable to connect to Live media.");
    }
   }
  };

  void connect();

  return()=>{
   cancelled=true;
   if(timer)window.clearInterval(timer);
   setRemoteMedia([]);
   setConnected(false);
   room.removeAllListeners();
   void room.disconnect();
   roomRef.current=null;
   fetch(`/api/porch/${slug}/disconnect`,{method:"POST",keepalive:true}).catch(()=>{});
  };
 },[status,slug,loadMembers]);

 useEffect(()=>{
  const room=roomRef.current;
  if(!room||!connected)return;

  const sync=async()=>{
   try{
    if(!publish){
     await Promise.all([
      room.localParticipant.setCameraEnabled(false),
      room.localParticipant.setMicrophoneEnabled(false)
     ]);
     setCamera(false);
     setMic(false);
     if(localVideo.current)localVideo.current.srcObject=null;
     return;
    }

    if(roomType==="VIDEO"){
     await room.localParticipant.enableCameraAndMicrophone();
     setCamera(true);
     setMic(true);
     attachLocalCamera();
    }else{
     await room.localParticipant.setCameraEnabled(false);
     await room.localParticipant.setMicrophoneEnabled(true);
     setCamera(false);
     setMic(true);
    }
    setMessage("");
   }catch{
    setMessage("Stage media permission is syncing. Try again in a moment.");
   }
  };

  void sync();
 },[connected,publish,roomType,attachLocalCamera]);

 const toggleMic=async()=>{
  const room=roomRef.current;
  if(!room||!publish)return;
  try{
   const next=!mic;
   await room.localParticipant.setMicrophoneEnabled(next);
   setMic(next);
  }catch{
   setMessage("Microphone could not be changed.");
  }
 };

 const toggleCamera=async()=>{
  const room=roomRef.current;
  if(!room||!publish||roomType!=="VIDEO")return;
  try{
   const next=!camera;
   await room.localParticipant.setCameraEnabled(next);
   setCamera(next);
   if(next)attachLocalCamera();
  }catch{
   setMessage("Camera could not be changed.");
  }
 };

 const enableAudio=async()=>{
  const room=roomRef.current;
  if(!room)return;
  try{
   await room.startAudio();
   setAudioBlocked(false);
  }catch{
   setMessage("Tap again to enable Live audio.");
  }
 };

 if(status!=="LIVE"){
  return <section className="featureCard"><span className="eyebrow">Live Media</span><p>Media controls appear when the room goes live.</p></section>;
 }

 return <>
  <section className="featureCard">
   <span className="eyebrow">LIVE {roomType} · SFU</span>
   <h2>{connected?"Connected":"Connecting…"}</h2>

   {audioBlocked&&<button onClick={enableAudio}>Enable Live audio</button>}

   {publish&&<div>
    <label>
     Lens / Filter
     <select value={filter} onChange={event=>setFilter(event.target.value)}>
      <option value="none">Natural</option>
      <option value="brightness(1.12) saturate(1.15)">Bright</option>
      <option value="contrast(1.12) saturate(1.2)">Pop</option>
      <option value="grayscale(.8) contrast(1.08)">Mono</option>
      <option value="sepia(.35) saturate(1.15)">Warm</option>
     </select>
    </label>

    {roomType==="VIDEO"&&
     <video ref={localVideo} autoPlay playsInline muted style={{width:"100%",maxWidth:520,borderRadius:16,filter}}/>
    }

    <div>
     <button onClick={toggleMic}>{mic?"Mute mic":"Unmute mic"}</button>
     {roomType==="VIDEO"&&
      <button onClick={toggleCamera}>{camera?"Camera off":"Camera on"}</button>
     }
    </div>
   </div>}

   <div>
    {remoteMedia.map(item=>{
     const member=members.find(candidate=>candidate.userId===item.participantId);
     const name=member?.user.displayName??"Guest";
     return <div key={item.id}>
      <b>{name}</b>
      {member?.role&&<span> · {member.role.toLowerCase()}</span>}
      {item.track.kind===Track.Kind.Video
       ?<RemoteVideo track={item.track} filter={filter}/>
       :<RemoteAudio track={item.track}/>
      }
     </div>;
    })}
   </div>

   {message&&<p>{message}</p>}
  </section>

  {connected&&
   <LiveEffects
    slug={slug}
    host={liveRole==="HOST"}
    onApply={effect=>{
     setActiveEffect(effect);
     setFilter(effect?.css??"none");
    }}
   />
  }
  {activeEffect&&<p>Active effect: {activeEffect.name}</p>}
 </>;
}
