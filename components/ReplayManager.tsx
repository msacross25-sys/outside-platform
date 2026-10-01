"use client";
import {FormEvent,useEffect,useState} from "react";

export function ReplayManager({slug,host,status}:{slug:string;host:boolean;status:string}){
 const [replay,setReplay]=useState<any>(null);
 const [msg,setMsg]=useState("");

 async function load(){
  const response=await fetch(`/api/porch/${slug}/replay`,{cache:"no-store"});
  if(response.ok)setReplay((await response.json()).replay);
  else if(!host)setReplay(null);
 }

 useEffect(()=>{
  if(status!=="ENDED")return;
  void load();
  const timer=window.setInterval(()=>void load(),5000);
  return()=>clearInterval(timer);
 },[status,slug]);

 async function patch(data:any){
  const response=await fetch(`/api/porch/${slug}/replay`,{
   method:"PATCH",
   headers:{"content-type":"application/json"},
   body:JSON.stringify(data)
  });
  if(response.ok)await load();
 }

 async function clip(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const form=new FormData(e.currentTarget);
  const response=await fetch(`/api/porch/${slug}/clips`,{
   method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({
    title:form.get("title"),
    startSeconds:Number(form.get("start")),
    endSeconds:Number(form.get("end")),
    visibility:form.get("visibility")
   })
  });
  const data=await response.json();
  setMsg(response.ok?"Clip created and queued for media processing.":data.error??"Unable to create clip.");
 }

 if(status!=="ENDED"||!replay)return null;

 if(replay.status==="DELETED"){
  return host?<section className="featureCard">
   <span className="eyebrow">Live Replay</span>
   <h2>Replay deleted</h2>
   <p>This replay is no longer available.</p>
  </section>:null;
 }

 if(replay.status==="FAILED"){
  return host?<section className="featureCard">
   <span className="eyebrow">Live Replay</span>
   <h2>Replay recording failed</h2>
   <p>The Live ended normally, but its recording could not be finalized. The Live analytics and gift records are still preserved.</p>
  </section>:null;
 }

 return <section className="featureCard">
  <span className="eyebrow">Live Replay</span>
  <h2>{replay.status==="READY"?"Replay ready":"Replay processing"}</h2>
  <p>
   {Math.floor(replay.durationSeconds/60)} min · {replay.totalViewers} viewers · peak {replay.peakViewers}
   {" · "}❤️ {replay.reactionCount} · {replay.commentCount} comments
  </p>

  {host&&<p>
   New followers {replay.followersGained} · Gifts {replay.giftCount} · Creator earnings ${(replay.creatorEarningsCents/100).toFixed(2)}
  </p>}

  {replay.mediaUrl&&replay.status==="READY"&&<video
   controls
   src={replay.mediaUrl}
   style={{width:"100%",maxWidth:640,borderRadius:16}}
  />}

  {host&&replay.status!=="DELETED"&&<>
   <button onClick={()=>patch({visible:!replay.visible})}>
    {replay.visible?"Hide replay":"Make replay visible"}
   </button>

   {replay.downloadUrl&&<a href={replay.downloadUrl}>Save replay</a>}

   <button onClick={()=>patch({status:"DELETED"})}>Delete replay</button>

   {replay.status==="READY"&&<form onSubmit={clip}>
    <input name="title" maxLength={100} placeholder="Clip title"/>
    <input name="start" type="number" min="0" placeholder="Start seconds" required/>
    <input name="end" type="number" min="1" placeholder="End seconds" required/>
    <select name="visibility">
     <option value="PUBLIC">Public</option>
     <option value="FOLLOWERS">Followers</option>
     <option value="PRIVATE">Private</option>
    </select>
    <button>Create clip</button>
   </form>}
  </>}

  {msg&&<p>{msg}</p>}
 </section>;
}
