"use client";
import { useEffect,useState } from "react";
type Data={followers:number;eligible:boolean;profile:{status:string;activatedAt:string|null}|null};
export function CreatorStatus(){
 const [data,setData]=useState<Data|null>(null),[message,setMessage]=useState("");
 async function load(){const r=await fetch("/api/creator/status");const d=await r.json();if(!r.ok){setMessage(d.error??"Unable to load creator status.");return}setData(d)}
 useEffect(()=>{load()},[]);
 async function activate(){setMessage("");const r=await fetch("/api/creator/status",{method:"POST"});const d=await r.json();if(!r.ok){setMessage(d.error??"Unable to activate Creator features.");return}setMessage("Creator features activated.");await load()}
 if(!data)return <section className="walletCard"><span className="eyebrow">Creator Status</span><p>{message||"Loading…"}</p></section>;
 const active=data.profile?.status==="ACTIVE";
 return <section className="walletCard"><span className="eyebrow">Creator Status</span><h2>{active?"Creator Active":data.eligible?"Creator Eligible":"Build Your Audience"}</h2><p>{data.followers.toLocaleString()} / 300 followers</p>{active?<p>Your Creator features are active.</p>:data.eligible?<button onClick={activate}>Activate Creator Features</button>:<p>Creator features unlock when your account reaches 300 followers.</p>}{message&&<p>{message}</p>}</section>
}