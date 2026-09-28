"use client";
import { useState } from "react";
export function LiveRoomControls({slug,screenSharing}:{slug:string;screenSharing:boolean}){
 const [sharing,setSharing]=useState(screenSharing),[message,setMessage]=useState("");
 async function toggle(){
  const r=await fetch(`/api/porch/${slug}/screen-share`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({enabled:!sharing})});const d=await r.json();
  if(!r.ok){setMessage(d.error??"Unable to update screen sharing.");return}setSharing(d.screenSharing);setMessage("");
 }
 return <section className="moderatorPanel"><div className="moderatorPanelHead"><div><span className="eyebrow">Host controls</span><h2>Live Tools</h2></div></div>{sharing&&<div className="screenShareNotice"><b>You are sharing your screen.</b><span>Everyone in the room can see the shared screen.</span></div>}<button onClick={toggle}>{sharing?"Stop Screen Share":"Share Screen"}</button>{message&&<p>{message}</p>}<p><small>Share only content you have permission to display or rebroadcast.</small></p></section>
}