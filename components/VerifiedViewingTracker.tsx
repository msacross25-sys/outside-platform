"use client";
import {useEffect,useRef,useState} from "react";
export function VerifiedViewingTracker({slug,status,host}:{slug:string;status:string;host:boolean}){
 const session=useRef<string|null>(null),timer=useRef<number|undefined>(undefined);const [eligible,setEligible]=useState(false),[hours,setHours]=useState(0),[message,setMessage]=useState("");
 useEffect(()=>{if(status!=="LIVE"||host)return;let stopped=false;
  const tick=async()=>{const body=session.current?{sessionId:session.current}:{};const r=await fetch(`/api/porch/${slug}/viewing`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const d=await r.json();
   if(stopped)return;
   if(r.ok){if(!session.current)session.current=d.sessionId;setEligible(true);setHours(Number(d.verifiedSeconds??0)/3600);setMessage("")}
   else if(r.status===403&&d.minutesRemaining){setEligible(false);setMessage(`Verified viewing starts in about ${d.minutesRemaining} minute${d.minutesRemaining===1?"":"s"}.`)}
  };
  tick();timer.current=window.setInterval(tick,10000);
  return()=>{stopped=true;if(timer.current)clearInterval(timer.current);if(session.current)fetch(`/api/porch/${slug}/viewing`,{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({sessionId:session.current})}).catch(()=>{});session.current=null};
 },[slug,status,host]);
 if(status!=="LIVE"||host)return null;
 return <section className="featureCard"><span className="eyebrow">Verified Viewing</span>{eligible?<p>Verified viewing time: <b>{hours.toFixed(1)} hours</b></p>:<p>{message||"Preparing verified viewing…"}</p>}</section>;
}