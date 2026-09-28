"use client";
import { useEffect,useState } from "react";
type Banned={userId:string;user:{username:string;displayName:string}};
export function PorchBanManager({slug}:{slug:string}){const [items,setItems]=useState<Banned[]>([]),[message,setMessage]=useState("");
 async function load(){const r=await fetch(`/api/porch/${slug}/bans`);const d=await r.json();if(r.ok)setItems(d.banned)}
 useEffect(()=>{load()},[]);
 async function unban(userId:string){const r=await fetch(`/api/porch/${slug}/bans`,{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({userId})});const d=await r.json();if(!r.ok){setMessage(d.error??"Unable to unban.");return}setItems(x=>x.filter(i=>i.userId!==userId));setMessage("Participant unbanned.")}
 return <section className="moderatorPanel"><div className="moderatorPanelHead"><div><span className="eyebrow">Host controls</span><h2>Banned From Room</h2></div><b>{items.length}</b></div>{message&&<p>{message}</p>}{items.length===0?<p>No one is currently banned.</p>:<div className="roomModerationList">{items.map(x=><div key={x.userId}><span><b>{x.user.displayName}</b><small>@{x.user.username}</small></span><button onClick={()=>unban(x.userId)}>Unban</button></div>)}</div>}</section>}