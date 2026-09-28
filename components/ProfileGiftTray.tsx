"use client";
import {useState} from "react";
import {GIFTS} from "@/lib/gifts";
export function ProfileGiftTray({username}:{username:string}){
 const [open,setOpen]=useState(false),[message,setMessage]=useState("");
 async function send(g:(typeof GIFTS)[number]){
  if(g.premium&&!confirm("Confirm this high-value gift?"))return;
  const r=await fetch("/api/profile-gifts/"+encodeURIComponent(username),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({giftKey:g.key,confirmed:g.premium})});
  const d=await r.json();setMessage(r.ok?g.name+" sent!":d.error??"Unable to send gift.");
 }
 return <section className="featureCard"><h2>Gifts</h2><button onClick={()=>setOpen(v=>!v)}>{open?"Close gifts":"Send a gift"}</button>{open&&<div className="giftGrid">{GIFTS.map(g=><button key={g.key} onClick={()=>send(g)}><b>{g.name}</b><span>{g.coins.toLocaleString()} coins</span></button>)}</div>}{message&&<p>{message}</p>}</section>
}