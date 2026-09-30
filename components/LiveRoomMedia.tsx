"use client";

import {useEffect,useState} from "react";
import {LiveKitRoomMedia} from "@/components/LiveKitRoomMedia";
import {MeshLiveRoomMedia} from "@/components/MeshLiveRoomMedia";

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

type Transport="loading"|"livekit"|"mesh"|"error";

export function LiveRoomMedia(props:Props){
 const [transport,setTransport]=useState<Transport>("loading");
 const [message,setMessage]=useState("");

 useEffect(()=>{
  let cancelled=false;

  const load=async()=>{
   try{
    const response=await fetch("/api/live/rtc-config",{cache:"no-store"});
    const data=await response.json().catch(()=>null);
    if(cancelled)return;

    if(!response.ok){
     setMessage(data?.error??"Live media is unavailable.");
     setTransport("error");
     return;
    }

    if(data?.mode==="livekit"){
     setTransport("livekit");
     return;
    }

    if(data?.mode==="mesh"){
     setTransport("mesh");
     return;
    }

    setMessage("Live media configuration is invalid.");
    setTransport("error");
   }catch{
    if(!cancelled){
     setMessage("Live media configuration could not be loaded.");
     setTransport("error");
    }
   }
  };

  void load();
  return()=>{cancelled=true};
 },[]);

 if(transport==="loading"){
  return <section className="featureCard"><span className="eyebrow">Live Media</span><p>Preparing Live connection…</p></section>;
 }

 if(transport==="error"){
  return <section className="featureCard"><span className="eyebrow">Live Media</span><p>{message}</p></section>;
 }

 if(transport==="livekit"){
  return <LiveKitRoomMedia {...props}/>;
 }

 return <MeshLiveRoomMedia {...props}/>;
}
