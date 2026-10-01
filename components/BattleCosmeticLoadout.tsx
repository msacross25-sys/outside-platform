"use client";
import {useEffect,useMemo,useState} from "react";

type Slot="FRAME"|"NAME"|"ENTRANCE"|"VICTORY"|"EMOJI"|"GIFT";
type Cosmetic={effectKey:string;slot:Slot;label:string;source:string;unlockedAt:string};
type Selection={
 frameKey:string|null;
 nameEffectKey:string|null;
 entranceKey:string|null;
 victoryKey:string|null;
 emojiKey:string|null;
 giftEffectKey:string|null;
}|null;
type ResponseData={unlocked:Cosmetic[];selection:Selection};

const SLOT_LABELS:Record<Slot,string>={
 FRAME:"Profile Frame",
 NAME:"Name Effect",
 ENTRANCE:"Entrance Effect",
 VICTORY:"Victory Animation",
 EMOJI:"Emoji Pack",
 GIFT:"Gift Effect"
};

function selectedKey(selection:Selection,slot:Slot){
 if(!selection)return null;
 if(slot==="FRAME")return selection.frameKey;
 if(slot==="NAME")return selection.nameEffectKey;
 if(slot==="ENTRANCE")return selection.entranceKey;
 if(slot==="VICTORY")return selection.victoryKey;
 if(slot==="EMOJI")return selection.emojiKey;
 return selection.giftEffectKey;
}

export function BattleCosmeticLoadout(){
 const [data,setData]=useState<ResponseData|null>(null);
 const [message,setMessage]=useState("");
 const groups=useMemo(()=>{
  const map=new Map<Slot,Cosmetic[]>();
  for(const item of data?.unlocked??[]){
   const list=map.get(item.slot)??[];
   list.push(item);
   map.set(item.slot,list);
  }
  return map;
 },[data]);

 async function load(){
  const response=await fetch("/api/battles/cosmetics",{cache:"no-store"});
  if(response.ok)setData(await response.json());
 }
 useEffect(()=>{void load()},[]);

 async function equip(effectKey:string){
  setMessage("");
  const response=await fetch("/api/battles/cosmetics",{
   method:"PATCH",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({effectKey})
  });
  const result=await response.json();
  setMessage(response.ok?"Cosmetic equipped.":result.error??"Unable to equip cosmetic.");
  if(response.ok)await load();
 }

 async function clear(slot:Slot){
  setMessage("");
  const response=await fetch("/api/battles/cosmetics",{
   method:"DELETE",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({slot})
  });
  const result=await response.json();
  setMessage(response.ok?"Cosmetic slot cleared.":result.error??"Unable to clear cosmetic.");
  if(response.ok)await load();
 }

 if(!data)return <section className="featureCard"><p>Loading battle cosmetics…</p></section>;

 const slots=(Object.keys(SLOT_LABELS) as Slot[]).filter(slot=>(groups.get(slot)?.length??0)>0);

 return <section className="featureCard">
  <span className="eyebrow">BATTLE COSMETIC LOADOUT</span>
  <h2>Equip your look.</h2>
  <p>Unlocked cosmetics stay yours. Choose one active effect per slot.</p>
  {!slots.length&&<p>Win battles, build streaks and claim Battle Pass or Winner’s Wheel rewards to unlock cosmetics.</p>}
  {slots.map(slot=>{
   const current=selectedKey(data.selection,slot);
   return <div className="featureCard" key={slot}>
    <div className="moderatorPanelHead">
     <h3>{SLOT_LABELS[slot]}</h3>
     {current&&<button type="button" onClick={()=>clear(slot)}>Clear</button>}
    </div>
    {(groups.get(slot)??[]).map(item=><button
     type="button"
     key={item.effectKey}
     onClick={()=>equip(item.effectKey)}
     aria-pressed={current===item.effectKey}
    >{current===item.effectKey?"✓ ":""}{item.label}</button>)}
   </div>;
  })}
  {message&&<p>{message}</p>}
 </section>;
}
