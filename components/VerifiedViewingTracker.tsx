"use client";
import {useEffect,useRef,useState} from "react";

export function VerifiedViewingTracker({slug,status,host}:{slug:string;status:string;host:boolean}){
 const session=useRef<string|null>(null),timer=useRef<number|undefined>(undefined),lastActivity=useRef(0);
 const [eligible,setEligible]=useState(false),[hours,setHours]=useState(0),[message,setMessage]=useState("");
 useEffect(()=>{
  if(status!=="LIVE"||host)return;
  let stopped=false;
  const activity=()=>{if(document.visibilityState==="visible")lastActivity.current=Date.now()};
  lastActivity.current=Date.now();
  ["pointerdown","keydown","touchstart"].forEach(e=>window.addEventListener(e,activity,{passive:true}));
  document.addEventListener("visibilitychange",activity);
  const tick=async()=>{
   const active=document.visibilityState==="visible"&&document.hasFocus()&&Date.now()-lastActivity.current<30000;
   const r=await fetch(`/api/porch/${slug}/viewing`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...(session.current?{sessionId:session.current}:{}),active})});
   const d=await r.json();
   if(stopped)return;
   if(r.ok){
    if(!session.current)session.current=d.sessionId;
    setEligible(!d.paused);
    setHours(Number(d.verifiedSeconds??0)/3600);
    setMessage(d.paused?"Verified viewing is paused while this tab is inactive.":"");
   }else if(r.status===403&&d.minutesRemaining){
    setEligible(false);
    setMessage(`Verified viewing starts in about ${d.minutesRemaining} minute${d.minutesRemaining===1?"":"s"}.`);
   }else if(r.status===409){
    setEligible(false);
    setMessage("Verified viewing is already active in another Live.");
   }
  };
  activity();
  void tick();
  timer.current=window.setInterval(tick,25000);
  return()=>{
   stopped=true;
   if(timer.current)clearInterval(timer.current);
   ["pointerdown","keydown","touchstart"].forEach(e=>window.removeEventListener(e,activity));
   document.removeEventListener("visibilitychange",activity);
   if(session.current)fetch(`/api/porch/${slug}/viewing`,{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({sessionId:session.current}),keepalive:true}).catch(()=>{});
   session.current=null;
  };
 },[slug,status,host]);
 if(status!=="LIVE"||host)return null;
 return <section className="featureCard"><span className="eyebrow">Verified Viewing</span>{eligible?<p>Verified viewing time: <b>{hours.toFixed(1)} hours</b></p>:<p>{message||"Preparing verified viewing…"}</p>}</section>;
}
