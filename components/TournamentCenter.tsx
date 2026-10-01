"use client";
import {FormEvent,useEffect,useState} from "react";
import Link from "next/link";

export function TournamentCenter(){
 const [data,setData]=useState<any>(null);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);

 async function load(){
  const response=await fetch("/api/battles/tournaments",{cache:"no-store"});
  setData(response.ok?await response.json():null);
 }

 useEffect(()=>{void load()},[]);

 async function create(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMessage("");
  const form=new FormData(e.currentTarget);
  const response=await fetch("/api/battles/tournaments",{
   method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({
    name:form.get("name"),
    bracketSize:Number(form.get("bracketSize")),
    startsAt:form.get("startsAt")||null,
    prizePoolCents:Math.max(0,Math.round(Number(form.get("prizePoolDollars")||0)*100))
   })
  });
  const result=await response.json();
  setMessage(response.ok?"Tournament created.":result.error??"Unable to create tournament.");
  if(response.ok){e.currentTarget.reset();await load()}
  setBusy(false);
 }

 async function join(id:string){
  setMessage("");
  const response=await fetch("/api/battles/tournaments/"+id+"/join",{method:"POST"});
  const result=await response.json();
  setMessage(response.ok?"Tournament entry confirmed.":result.error??"Unable to join tournament.");
  if(response.ok)await load();
 }

 async function start(id:string){
  setMessage("");
  const response=await fetch("/api/battles/tournaments/"+id+"/start",{method:"POST"});
  const result=await response.json();
  setMessage(response.ok?"Tournament is live. Launch matches from your Live Battle Center.":result.error??"Unable to start tournament.");
  if(response.ok)await load();
 }

 return <div>
  <section className="featureCard">
   <span className="eyebrow">HOST TOURNAMENT TOOLS</span>
   <h2>Create a Tournament</h2>
   <form onSubmit={create}>
    <label>Name <input name="name" minLength={3} maxLength={100} required/></label>
    <label>Bracket <select name="bracketSize" defaultValue="8"><option value="4">4 entrants</option><option value="8">8 entrants</option><option value="16">16 entrants</option><option value="32">32 entrants</option></select></label>
    <label>Starts <input name="startsAt" type="datetime-local"/></label>
    <label>Optional prize pool ($) <input name="prizePoolDollars" type="number" min="0" step="0.01" defaultValue="0"/></label>
    <button disabled={busy}>{busy?"Creating…":"Create Tournament"}</button>
   </form>
   <p><small>Creating and entering tournaments requires approved Host status.</small></p>
  </section>

  <section className="featureCard">
   <span className="eyebrow">TOURNAMENTS</span>
   <h2>Open & Live</h2>
   {!data?.tournaments?.length&&<p>No open tournaments yet.</p>}
   {data?.tournaments?.map((t:any)=><article className="searchResult" key={t.id}>
    <Link href={"/battles/tournaments/"+t.id}><b>{t.name}</b></Link>
    <span>{t.status} · {t._count.entries}/{t.bracketSize} entrants · Round {t.currentRound}</span>
    <p>Host: @{t.owner.username}{t.prizePoolCents>0?" · Prize pool $"+(t.prizePoolCents/100).toFixed(2):""}</p>
    {t.status==="REGISTRATION"&&<button type="button" onClick={()=>join(t.id)}>Enter Tournament</button>}
    {t.status==="REGISTRATION"&&<button type="button" onClick={()=>start(t.id)}>Start Tournament</button>}
   </article>)}
  </section>
  {message&&<p>{message}</p>}
 </div>;
}
