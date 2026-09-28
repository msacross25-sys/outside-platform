"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {LiveEffects} from "@/components/LiveEffects";
type Member={userId:string;role:string;user:{id:string;username:string;displayName:string}};
type Props={slug:string;roomType:"VIDEO"|"VOICE";status:string;meId:string;initialMembers:Member[];myRole:string|null};
const PUBLISH_ROLES=["HOST","COHOST","SPEAKER"];
export function LiveRoomMedia({slug,roomType,status,meId,initialMembers,myRole}:{slug:string;roomType:"VIDEO"|"VOICE";status:string;meId:string;initialMembers:Member[];myRole:string|null}){
 const [members,setMembers]=useState(initialMembers),[joined,setJoined]=useState(!!initialMembers.find(x=>x.userId===meId)),[message,setMessage]=useState(""),[mic,setMic]=useState(false),[camera,setCamera]=useState(roomType==="VIDEO") ,[filter,setFilter]=useState("none"),[activeEffect,setActiveEffect]=useState<any>(null);
 const localVideo=useRef<HTMLVideoElement>(null),localStream=useRef<MediaStream|null>(null),peers=useRef(new Map<string,RTCPeerConnection>()),seen=useRef(new Set<string>()),poll=useRef<number|undefined>(undefined);
 const liveRole=members.find(x=>x.userId===meId)?.role??myRole;const publish=PUBLISH_ROLES.includes(liveRole??"");
 const signal=useCallback(async(targetUserId:string,type:string,payload:any)=>{await fetch(`/api/porch/${slug}/signal`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({targetUserId,type,payloadJson:JSON.stringify(payload)})})},[slug]);
 const makePeer=useCallback((target:Member)=>{
  if(target.userId===meId)return null;
  const existing=peers.current.get(target.userId);if(existing)return existing;
  const pc=new RTCPeerConnection();
  pc.onicecandidate=e=>{if(e.candidate)signal(target.userId,"ice",e.candidate.toJSON())};
  pc.ontrack=e=>{const el=document.getElementById(`remote-${target.userId}`) as HTMLVideoElement|null;if(el&&e.streams[0]){el.srcObject=e.streams[0];el.play().catch(()=>{})}};
  if(localStream.current)localStream.current.getTracks().forEach(t=>pc.addTrack(t,localStream.current!));
  peers.current.set(target.userId,pc);return pc;
 },[meId,signal]);
 const join=useCallback(async()=>{const r=await fetch(`/api/porch/${slug}/join`,{method:"POST"});const d=await r.json();if(!r.ok){setMessage(d.error??"Unable to join live room.");return false}setJoined(true);return true},[slug]);
 const loadMembers=useCallback(async()=>{const r=await fetch(`/api/porch/${slug}/members`);if(r.ok){const d=await r.json();setMembers(d.members)}},[slug]);
 const startMedia=useCallback(async()=>{if(!publish||localStream.current)return;try{const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:roomType==="VIDEO"});localStream.current=stream;if(localVideo.current){localVideo.current.srcObject=stream;localVideo.current.muted=true;await localVideo.current.play().catch(()=>{})}setMic(true);setCamera(roomType==="VIDEO")}catch{setMessage("Camera/microphone permission is required for the stage.");}},[publish,roomType]);
 const stopMedia=useCallback(()=>{localStream.current?.getTracks().forEach(t=>t.stop());localStream.current=null;if(localVideo.current)localVideo.current.srcObject=null;setMic(false)},[]);
 const handleSignal=useCallback(async(s:any)=>{
  if(seen.current.has(s.id))return;seen.current.add(s.id);const target=members.find(m=>m.userId===s.senderId);if(!target)return;const pc=makePeer(target);if(!pc)return;
  const data=JSON.parse(s.payloadJson);
  if(s.type==="offer"){await pc.setRemoteDescription(data);const answer=await pc.createAnswer();await pc.setLocalDescription(answer);await signal(s.senderId,"answer",answer)}
  else if(s.type==="answer"){await pc.setRemoteDescription(data)}
  else if(s.type==="ice"){try{await pc.addIceCandidate(data)}catch{}}
 },[members,makePeer,signal]);
 const pollSignals=useCallback(async()=>{const r=await fetch(`/api/porch/${slug}/signal?since=${Date.now()-10000}`);if(r.ok){const d=await r.json();for(const s of d.signals)await handleSignal(s)}},[slug,handleSignal]);
 useEffect(()=>{if(status!=="LIVE")return;join().then(async ok=>{if(ok)await loadMembers()});poll.current=window.setInterval(()=>{loadMembers();pollSignals()},2500);return()=>{if(poll.current)clearInterval(poll.current);stopMedia();peers.current.forEach(p=>p.close());peers.current.clear()}},[status,join,loadMembers,pollSignals,stopMedia]);
 useEffect(()=>{if(status!=="LIVE"||!joined)return;startMedia()},[status,joined,startMedia]);
 useEffect(()=>{if(!joined||members.length<2)return;const timer=window.setTimeout(async()=>{for(const target of members){if(target.userId===meId||!PUBLISH_ROLES.includes(target.role))continue;const pc=makePeer(target);if(!pc||target.userId<meId)continue;const offer=await pc.createOffer();await pc.setLocalDescription(offer);await signal(target.userId,"offer",offer)}},500);return()=>clearTimeout(timer)},[joined,members,meId,makePeer,signal]);
 if(status!=="LIVE")return <section className="featureCard"><span className="eyebrow">Live Media</span><p>Media controls appear when the room goes live.</p></section>;
 return <section className="featureCard"><span className="eyebrow">LIVE {roomType}</span><h2>{joined?"Connected":"Connecting…"}</h2>{publish&&<div><label>Lens / Filter <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="none">Natural</option><option value="brightness(1.12) saturate(1.15)">Bright</option><option value="contrast(1.12) saturate(1.2)">Pop</option><option value="grayscale(.8) contrast(1.08)">Mono</option><option value="sepia(.35) saturate(1.15)">Warm</option></select></label><video ref={localVideo} autoPlay playsInline muted style={{width:"100%",maxWidth:520,borderRadius:16,filter}}/><div><button onClick={()=>{if(mic){localStream.current?.getAudioTracks().forEach(t=>t.enabled=false);setMic(false)}else{localStream.current?.getAudioTracks().forEach(t=>t.enabled=true);setMic(true)}}}>{mic?"Mute mic":"Unmute mic"}</button>{roomType==="VIDEO"&&<button onClick={()=>{localStream.current?.getVideoTracks().forEach(t=>t.enabled=!camera);setCamera(!camera)}}>{camera?"Camera off":"Camera on"}</button>}</div></div>}<div>{members.filter(m=>m.userId!==meId&&PUBLISH_ROLES.includes(m.role)).map(m=><div key={m.userId}><b>{m.user.displayName}</b><span> · {m.role.toLowerCase()}</span>{roomType==="VIDEO"?<video id={`remote-${m.userId}`} autoPlay playsInline style={{width:"100%",maxWidth:520,borderRadius:16,filter}}/>:<audio id={`remote-${m.userId}`} autoPlay/>}</div>)}</div>{message&&<p>{message}</p>}</section>{publish&&<LiveEffects slug={slug} host={liveRole==="HOST"} onApply={effect=>{setActiveEffect(effect);setFilter(effect?.css??"none")}}/>}{activeEffect&&<p>Active effect: {activeEffect.name}</p>}</>
}