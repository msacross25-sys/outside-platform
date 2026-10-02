"use client";
import {FormEvent,useEffect,useState} from "react";

type Ticket={
 id:string;
 category:string;
 subject:string;
 body:string;
 status:string;
 priority:string;
 staffResponse:string|null;
 createdAt:string;
 respondedAt:string|null;
};

export function SupportCenter(){
 const [tickets,setTickets]=useState<Ticket[]>([]);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [loadError,setLoadError]=useState("");

 async function load(){
  setLoading(true);setLoadError("");
  try{
  const response=await fetch("/api/support",{cache:"no-store"});
  if(!response.ok)throw new Error(response.status===401?"Sign in to view your support tickets.":"Unable to load support tickets. Please try again.");
  setTickets((await response.json()).tickets??[]);
  }catch(error){
   setLoadError(error instanceof Error?error.message:"Unable to load support tickets. Please try again.");
  }finally{setLoading(false)}
 }

 useEffect(()=>{void load()},[]);

 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(busy)return;
  setBusy(true);setMessage("");
  const form=e.currentTarget;
  const data=new FormData(form);
  try{
  const response=await fetch("/api/support",{
   method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({
    category:data.get("category"),
    subject:data.get("subject"),
    body:data.get("body")
   })
  });
  const result=await response.json();
  if(response.ok){
   setMessage(result.ticket.priority==="VIP"?"💫 VIP priority ticket created.":"Support ticket created.");
   form.reset();
   await load();
  }else setMessage(result.error??"Unable to create support ticket.");
  }catch{
   setMessage("Could not confirm whether your ticket was sent. Refresh your tickets before submitting again.");
  }finally{setBusy(false)}
 }

 return <div>
  <section className="featureCard">
   <span className="eyebrow">OUTSiiDE SUPPORT</span>
   <h2>How can we help?</h2>
   <form className="createRoomForm" onSubmit={submit}>
    <label>Category<select name="category" defaultValue="ACCOUNT"><option>ACCOUNT</option><option>LIVE</option><option>BATTLE</option><option>PAYMENTS</option><option>SAFETY</option><option>OTHER</option></select></label>
    <label>Subject<input name="subject" minLength={4} maxLength={120} required/></label>
    <label>Message<textarea name="body" minLength={10} maxLength={3000} required/></label>
    <button disabled={busy}>{busy?"Sending…":"Submit Ticket"}</button>
   </form>
   <p><small>Battle VIP and active Premium Battle Pass accounts are assigned VIP queue priority automatically.</small></p>
   {message&&<p role="status">{message}</p>}
  </section>

  <section className="featureCard">
   <span className="eyebrow">YOUR TICKETS</span>
   {loading&&<p role="status">Loading support tickets…</p>}
   {loadError&&<p role="alert">{loadError} <button type="button" onClick={()=>void load()} disabled={loading}>Retry</button></p>}
   {!loading&&!loadError&&!tickets.length&&<p>No support tickets yet.</p>}
   {tickets.map(ticket=><article className="searchResult" key={ticket.id}>
    <b>{ticket.priority==="VIP"?"💫 VIP · ":""}{ticket.subject}</b>
    <span>{ticket.category} · {ticket.status} · {new Date(ticket.createdAt).toLocaleString()}</span>
    <p>{ticket.body}</p>
    {ticket.staffResponse&&<p><b>OUTSiiDE Support:</b> {ticket.staffResponse}</p>}
   </article>)}
  </section>
 </div>;
}
