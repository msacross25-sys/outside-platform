"use client";
import { useState } from "react";
import { GIFTS } from "@/lib/gifts";
const money=(c:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(c/100);
export function GiftTray({slug,canGift}:{slug:string;canGift:boolean}){
 const [more,setMore]=useState(false),[message,setMessage]=useState("");
 if(!canGift)return null;
 const gifts=GIFTS.filter(g=>more||!g.premium);
 async function send(g:(typeof GIFTS)[number]){
  if(g.premium&&!window.confirm(`Send ${g.name} for ${g.coins.toLocaleString()} coins (${money(g.valueCents)})?`))return;
  setMessage("");const r=await fetch(`/api/porch/${slug}/gifts`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({giftKey:g.key,confirmed:g.premium})});const d=await r.json();
  setMessage(r.ok?`${g.name} sent!`:d.error??"Gift could not be sent.");
 }
 return <section className="giftTray"><div className="moderatorPanelHead"><div><span className="eyebrow">Live Gifts</span><h2>Send a Gift</h2></div><button onClick={()=>setMore(v=>!v)}>{more?"Standard Gifts":"More Gifts"}</button></div><div className="giftGrid">{gifts.map(g=><button key={g.key} onClick={()=>send(g)}><b>{g.name}</b><span>{g.coins.toLocaleString()} coins · {money(g.valueCents)}</span></button>)}</div>{message&&<p>{message}</p>}</section>
}