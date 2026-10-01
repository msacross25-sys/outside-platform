"use client";
import {useEffect,useState} from "react";
import {GIFTS} from "@/lib/gifts";

const money=(c:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(c/100);

export function GiftTray({slug,canGift}:{slug:string;canGift:boolean}){
 const [more,setMore]=useState(false);
 const [message,setMessage]=useState("");
 const [battleActive,setBattleActive]=useState(false);
 const [battleSide,setBattleSide]=useState<1|2|undefined>();

 useEffect(()=>{
  if(!canGift)return;
  let active=true;
  async function loadBattle(){
   const response=await fetch(`/api/porch/${slug}/battle`,{cache:"no-store"});
   if(!response.ok)return;
   const data=await response.json();
   if(!active)return;
   const live=data?.battle?.status==="LIVE";
   setBattleActive(live);
   if(!live)setBattleSide(undefined);
  }
  void loadBattle();
  const timer=window.setInterval(()=>void loadBattle(),5000);
  return()=>{active=false;clearInterval(timer)};
 },[slug,canGift]);

 if(!canGift)return null;
 const gifts=GIFTS.filter(g=>more||!g.premium);

 async function send(g:(typeof GIFTS)[number]){
  if(battleActive&&!battleSide){setMessage("Choose Side 1 or Side 2 before sending a battle gift.");return}
  if(g.premium&&!window.confirm(`Send ${g.name} for ${g.coins.toLocaleString()} coins (${money(g.valueCents)})?`))return;
  setMessage("");
  const response=await fetch(`/api/porch/${slug}/gifts`,{
   method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({giftKey:g.key,confirmed:g.premium,battleSide})
  });
  const data=await response.json();
  if(response.ok){
   setMessage(battleActive&&battleSide
    ?`${g.name} sent! +${g.coins.toLocaleString()} points to Side ${battleSide}.`
    :`${g.name} sent!`);
  }else{
   setMessage(data.error??"Gift could not be sent.");
  }
 }

 return <section className="giftTray">
  <div className="moderatorPanelHead">
   <div><span className="eyebrow">Live Gifts</span><h2>{battleActive?"Battle Gifts":"Send a Gift"}</h2></div>
   <button onClick={()=>setMore(v=>!v)}>{more?"Standard Gifts":"More Gifts"}</button>
  </div>
  {battleActive&&<div className="battleGiftSides">
   <p><b>Choose who gets the battle points.</b> Gift coins equal battle points.</p>
   <button type="button" onClick={()=>setBattleSide(1)} aria-pressed={battleSide===1}>{battleSide===1?"✓ ":""}Side 1</button>
   <button type="button" onClick={()=>setBattleSide(2)} aria-pressed={battleSide===2}>{battleSide===2?"✓ ":""}Side 2</button>
  </div>}
  <div className="giftGrid">{gifts.map(g=><button key={g.key} onClick={()=>send(g)}><b>{g.name}</b><span>{g.coins.toLocaleString()} coins · {money(g.valueCents)}</span></button>)}</div>
  {message&&<p>{message}</p>}
 </section>;
}
