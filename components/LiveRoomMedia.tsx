"use client";
import {useEffect,useState} from "react";
import {LiveKitRoomMedia} from "@/components/LiveKitRoomMedia";
import {MeshLiveRoomMedia} from "@/components/MeshLiveRoomMedia";

type Member={userId:string;role:string;user:{id:string;username:string;displayName:string}};
type Props={slug:string;roomType:"VIDEO"|"VOICE";status:string;meId:string;initialMembers:Member[];myRole:string|null};

type ProviderState={
 provider:"livekit"|"mesh";
 ready:boolean;
};

export function LiveRoomMedia(props:Props){
 const [state,setState]=useState<ProviderState|null>(null);
 const [error,setError]=useState("");

 useEffect(()=>{
  let active=true;
  fetch("/api/live/provider",{cache:"no-store"})
   .then(async response=>{
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(data?.error??"Live media configuration is unavailable.");
    if(active)setState(data);
   })
   .catch(err=>{
    if(active)setError(err instanceof Error?err.message:"Live media configuration is unavailable.");
   });
  return()=>{active=false};
 },[]);

 if(error){
  return <section className="featureCard"><span className="eyebrow">Live Media</span><p>{error}</p></section>;
 }

 if(!state){
  return <section className="featureCard"><span className="eyebrow">Live Media</span><p>Preparing Live media…</p></section>;
 }

 if(state.provider==="livekit"){
  if(!state.ready){
   return <section className="featureCard"><span className="eyebrow">Live Media</span><p>Production Live media is not configured.</p></section>;
  }
  return <LiveKitRoomMedia {...props}/>;
 }

 return <MeshLiveRoomMedia {...props}/>;
}
