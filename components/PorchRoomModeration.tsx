"use client";
import { useState } from "react";
type Member={userId:string;role:string;user:{username:string;displayName:string}};
export function PorchRoomModeration({slug,members,role}:{slug:string;members:Member[];role:string|null}){
 const [people,setPeople]=useState(members),[message,setMessage]=useState("");
 if(!role||!["HOST","MODERATOR"].includes(role))return null;
 async function act(userId:string,action:"MUTE"|"UNMUTE"|"BAN"|"UNBAN"){
  setMessage("");const r=await fetch(`/api/porch/${slug}/moderate`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({userId,action})});const d=await r.json();
  if(!r.ok){setMessage(d.error??"Unable to moderate participant.");return}
  if(action==="BAN")setPeople(current=>current.filter(x=>x.userId!==userId));else setMessage(action==="MUTE"?"Participant muted.":"Participant updated.");
 }
 const targets=people.filter(x=>role==="HOST"?x.role!=="HOST":!["HOST","COHOST","MODERATOR"].includes(x.role));
 return <section className="moderatorPanel"><div className="moderatorPanelHead"><div><span className="eyebrow">Safety controls</span><h2>Room Moderation</h2></div><small>{role==="MODERATOR"?"Moderator · mute & ban only":"Host controls"}</small></div>{message&&<p>{message}</p>}<div className="roomModerationList">{targets.map(m=><div key={m.userId}><span><b>{m.user.displayName}</b><small>@{m.user.username}</small></span><div><button onClick={()=>act(m.userId,"MUTE")}>Mute</button><button onClick={()=>act(m.userId,"UNMUTE")}>Unmute</button><button onClick={()=>act(m.userId,"BAN")}>Ban</button></div></div>)}</div></section>
}