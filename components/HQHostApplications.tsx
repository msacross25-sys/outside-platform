"use client";
import { useEffect,useState } from "react";

type Application={id:string;status:string;appliedAt:string;reviewedAt:string|null;reviewedBy:{username:string;displayName:string}|null;user:{username:string;displayName:string;status:string;_count:{followers:number}}};
export function HQHostApplications(){
 const [items,setItems]=useState<Application[]>([]),[error,setError]=useState("");
 async function load(){const r=await fetch("/api/hq/hosts");const d=await r.json();if(!r.ok){setError(d.error??"Unable to load host applications.");return}setItems(d.applications);setError("")}
 useEffect(()=>{load()},[]);
 async function review(id:string,action:"APPROVED"|"REJECTED"|"REMOVED"){const r=await fetch("/api/hq/hosts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id,action})});const d=await r.json();if(!r.ok){setError(d.error??"Unable to update application.");return}await load()}
 if(error)return <section className="hqPanel"><h2>Host Applications</h2><p>{error}</p></section>;
 return <section className="hqPanel"><div className="hqPanelHead"><div><span className="eyebrow">Host Center</span><h2>Host Applications</h2></div><b>{items.filter(x=>x.status==="PENDING").length} pending</b></div>{items.length===0?<p>No host applications yet.</p>:<div className="hqHostList">{items.map(a=><article key={a.id}><div><b>{a.user.displayName}</b><span>@{a.user.username} · {a.user._count.followers} followers · {a.user.status}</span><small>{a.status} · Applied {new Date(a.appliedAt).toLocaleDateString()}</small>{a.reviewedAt&&<small>Reviewed {new Date(a.reviewedAt).toLocaleDateString()}{a.reviewedBy?` by ${a.reviewedBy.displayName} (@${a.reviewedBy.username})`:""}</small>}</div><div className="hqHostActions">{a.status==="PENDING"&&<button onClick={()=>review(a.id,"APPROVED")}>Approve</button>}{a.status==="PENDING"&&<button onClick={()=>review(a.id,"REJECTED")}>Reject</button>}{a.status==="APPROVED"&&<button onClick={()=>review(a.id,"REMOVED")}>Remove Host</button>}</div></article>)}</div>}</section>
}