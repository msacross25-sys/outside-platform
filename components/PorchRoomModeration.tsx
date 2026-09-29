"use client";
import {useState} from "react";

type Member={userId:string;role:string;user:{username:string;displayName:string}};

export function PorchRoomModeration({slug,members,role}:{slug:string;members:Member[];role:string|null}){
 const [people,setPeople]=useState(members),[message,setMessage]=useState("");
 if(!role||!["HOST","MODERATOR"].includes(role))return null;

 async function act(userId:string,action:"MUTE"|"UNMUTE"|"KICK"|"BAN"|"REPORT"){
  setMessage("");
  if(action==="BAN"&&!window.confirm("Ban this participant from this room? They will not be able to rejoin until you unban them."))return;
  const r=await fetch(`/api/porch/${slug}/moderate`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({userId,action})});
  const d=await r.json();
  if(!r.ok)return setMessage(d.error??"Unable to update participant.");
  if(action==="KICK"||action==="BAN")setPeople(x=>x.filter(p=>p.userId!==userId));
  setMessage(action==="REPORT"?"Report sent to OUTSiiDE Trust & Safety.":action==="KICK"?"Participant removed from this Live.":action==="BAN"?"Participant banned from this room.":action==="MUTE"?"Participant muted.":"Participant unmuted.");
 }

 const targets=people.filter(x=>x.role!=="HOST"&&(role==="HOST"||!["COHOST","MODERATOR"].includes(x.role)));
 return <section className="moderatorPanel"><div className="moderatorPanelHead"><div><span className="eyebrow">Safety controls</span><h2>Room Moderation</h2></div><small>{role==="HOST"?"Mute · Kick · Ban · Report":"Mute · Kick · Report"}</small></div>{message&&<p>{message}</p>}<div className="roomModerationList">{targets.map(m=><div key={m.userId}><span><b>{m.user.displayName}</b><small>@{m.user.username}</small></span><div><button onClick={()=>act(m.userId,"MUTE")}>Mute</button><button onClick={()=>act(m.userId,"UNMUTE")}>Unmute</button><button onClick={()=>act(m.userId,"KICK")}>Kick</button>{role==="HOST"&&<button onClick={()=>act(m.userId,"BAN")}>Ban</button>}<button onClick={()=>act(m.userId,"REPORT")}>Report</button></div></div>)}</div></section>;
}
