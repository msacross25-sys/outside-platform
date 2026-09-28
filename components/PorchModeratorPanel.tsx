"use client";
import { useState } from "react";
type Member={userId:string;role:string;user:{username:string;displayName:string}};
export function PorchModeratorPanel({slug,members,host}:{slug:string;members:Member[];host:boolean}){
 const [people,setPeople]=useState(members),[error,setError]=useState("");
 if(!host)return null;
 const moderators=people.filter(x=>x.role==="MODERATOR");
 async function change(userId:string,remove=false){
  setError("");const r=await fetch(`/api/porch/${slug}/moderators`,{method:remove?"DELETE":"POST",headers:{"content-type":"application/json"},body:JSON.stringify({userId})});const d=await r.json();
  if(!r.ok){setError(d.error??"Unable to update moderators.");return}
  setPeople(current=>current.map(x=>x.userId===userId?{...x,role:remove?"LISTENER":"MODERATOR"}:x));
 }
 return <section className="moderatorPanel"><div className="moderatorPanelHead"><div><span className="eyebrow">Room controls</span><h2>Moderators {moderators.length}/5</h2></div><small>Only you can manage moderators.</small></div>{error&&<p>{error}</p>}<div className="moderatorSlots">{[0,1,2,3,4].map(i=>{const m=moderators[i];return <div key={i}>{m?<><span><b>{m.user.displayName}</b><small>@{m.user.username}</small></span><button onClick={()=>change(m.userId,true)}>Remove</button></>:<span><b>Slot {i+1}</b><small>Empty</small></span>}</div>})}</div><h3>Add Moderator</h3><div className="moderatorCandidates">{people.filter(x=>!["HOST","MODERATOR"].includes(x.role)).map(m=><button key={m.userId} disabled={moderators.length>=5} onClick={()=>change(m.userId)}>{m.user.displayName} <span>@{m.user.username}</span></button>)}</div></section>
}