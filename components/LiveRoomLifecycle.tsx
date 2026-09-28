"use client";
import {useState} from "react";
export function LiveRoomLifecycle({slug,status}:{slug:string;status:string}){
 const [state,setState]=useState(status),[message,setMessage]=useState("");
 async function action(action:"START"|"END"|"CANCEL"){setMessage("");const r=await fetch(`/api/porch/${slug}/lifecycle`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action})});const d=await r.json();if(!r.ok){setMessage(d.error??"Unable to update room.");return}setState(d.status);setMessage(d.status==="LIVE"?"Your room is live.":d.status==="ENDED"?"Room ended.":"Room cancelled.");}
 return <section className="moderatorPanel"><span className="eyebrow">Room status</span><h2>{state}</h2>{state==="SCHEDULED"&&<div><button onClick={()=>action("START")}>Go Live</button><button onClick={()=>action("CANCEL")}>Cancel Room</button></div>}{state==="LIVE"&&<button onClick={()=>action("END")}>End Live</button>}{message&&<p>{message}</p>}</section>
}