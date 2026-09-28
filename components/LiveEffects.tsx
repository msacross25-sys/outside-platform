"use client";
import {useEffect,useState} from "react";
type Effect={key:string;name:string;kind:string;tier:string;css?:string;coins?:number;seasonal?:boolean;unlocked:boolean;owned:boolean};
export function LiveEffects({slug,host,onApply}:{slug:string;host:boolean;onApply:(effect:Effect|null)=>void}){
 const [effects,setEffects]=useState<Effect[]>([]);
 const [tab,setTab]=useState("FREE");
 const [preview,setPreview]=useState<Effect|null>(null);
 const [message,setMessage]=useState("");
 useEffect(()=>{fetch("/api/effects").then(r=>r.ok?r.json():null).then(d=>setEffects(d?.effects??[]))},[]);
 const shown=effects.filter(e=>tab==="FREE"?e.tier==="FREE":tab==="NEW"?e.seasonal:tab==="FOR_HOST"?Boolean(e.coins):e.kind===tab);
 async function send(effect:Effect){
  setMessage("");
  const r=await fetch("/api/porch/"+slug+"/effect-gift",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({effectKey:effect.key})});
  const d=await r.json();
  setMessage(r.ok?effect.name+" unlocked for the host. The host decides whether to use it.":d.error??"Unable to send effect.");
 }
 return <section className="featureCard">
  <span className="eyebrow">OUTSiiDE EFFECTS</span>
  <div>{["BEAUTY","FUN","BACKDROP","FOR_HOST","FREE","NEW"].map(name=><button key={name} onClick={()=>setTab(name)}>{name.replace("_"," ")}</button>)}</div>
  {preview&&<p>Preview: <b>{preview.name}</b> · {preview.tier}</p>}
  <div>{shown.map(effect=><div key={effect.key}><b>{effect.name}</b> <span>{effect.tier}</span> <button onClick={()=>setPreview(effect)}>Preview</button>{host&&effect.unlocked&&<button onClick={()=>onApply(effect)}>Apply</button>}{!host&&effect.coins&&<button onClick={()=>send(effect)}>Send to Host · {effect.coins} coins</button>}</div>)}</div>
  {host&&<button onClick={()=>onApply(null)}>Remove effect</button>}
  {message&&<p>{message}</p>}
 </section>;
}