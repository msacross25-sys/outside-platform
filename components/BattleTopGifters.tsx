"use client";
import {useEffect,useState} from "react";
import Link from "next/link";

const scopes=[["daily","Daily"],["weekly","Weekly"],["monthly","Monthly"],["global","Global"]] as const;

export function BattleTopGifters(){
 const [scope,setScope]=useState<(typeof scopes)[number][0]>("monthly");
 const [data,setData]=useState<any>(null);

 useEffect(()=>{
  let active=true;
  fetch("/api/battles/gifters?scope="+scope,{cache:"no-store"})
   .then(r=>r.json())
   .then(value=>{if(active)setData(value)});
  return()=>{active=false};
 },[scope]);

 return <section className="featureCard">
  <div className="moderatorPanelHead">
   <div><span className="eyebrow">TOP GIFTERS</span><h2>Supporters moving the scoreboard.</h2></div>
   <div>{scopes.map(([key,label])=><button key={key} type="button" onClick={()=>setScope(key)} aria-pressed={scope===key}>{label}</button>)}</div>
  </div>
  {!data?.gifters?.length&&<p>No battle gifts in this window yet.</p>}
  {data?.gifters?.map((row:any)=><Link className="searchResult" key={row.id} href={"/u/"+row.username}>
   <b>#{row.rank} {row.displayName}</b>
   <span>@{row.username}</span>
   <p>{"$"}{(row.giftValueCents/100).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} supported · {row.battlePoints.toLocaleString()} battle points · {row.gifts} gifts</p>
  </Link>)}
 </section>;
}
