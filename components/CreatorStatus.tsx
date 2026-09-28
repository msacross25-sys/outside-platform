"use client";
import { useEffect,useState } from "react";
type Level={key:string;name:string;followers:number;hours:number;creatorShare:number};
type Data={followers:number;verifiedViewingHours:number;eligible:boolean;level:Level|null;nextLevel:Level|null;profile:{status:string;activatedAt:string|null}|null};
export function CreatorStatus(){
 const [data,setData]=useState<Data|null>(null),[message,setMessage]=useState("");
 async function load(){const r=await fetch("/api/creator/status");const d=await r.json();if(!r.ok){setMessage(d.error??"Unable to load creator status.");return}setData(d)}
 useEffect(()=>{load()},[]);
 async function activate(){setMessage("");const r=await fetch("/api/creator/status",{method:"POST"});const d=await r.json();if(!r.ok){setMessage(d.error??"Unable to activate Creator features.");return}setMessage("Creator features activated.");await load()}
 if(!data)return <section className="walletCard"><span className="eyebrow">Creator Status</span><p>{message||"Loading…"}</p></section>;
 const active=data.profile?.status==="ACTIVE",next=data.nextLevel;
 return <section className="walletCard"><span className="eyebrow">Creator Progress</span><h2>{data.level?.name??(data.eligible?"Creator Eligible":"Build Your Audience")}</h2><p><b>Followers</b><br/>{data.followers.toLocaleString()} / {(next?.followers??500).toLocaleString()}</p><p><b>Verified Viewing Hours</b><br/>{data.verifiedViewingHours.toLocaleString(undefined,{maximumFractionDigits:1})} / {(next?.hours??1000).toLocaleString()}</p>{next&&<p>Next level: <b>{next.name}</b></p>}{active?<p>Your Creator features are active.</p>:data.eligible?<button onClick={activate}>Activate Creator Features</button>:<p>Creator unlocks at 500 followers + 1,000 verified viewing hours.</p>}{message&&<p>{message}</p>}</section>
}