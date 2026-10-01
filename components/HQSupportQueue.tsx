"use client";
import {useEffect,useState} from "react";

type Ticket={
 id:string;
 category:string;
 subject:string;
 body:string;
 status:string;
 priority:string;
 staffResponse:string|null;
 createdAt:string;
 user:{id:string;username:string;displayName:string;status:string};
};

export function HQSupportQueue(){
 const [tickets,setTickets]=useState<Ticket[]>([]);
 const [authorized,setAuthorized]=useState<boolean|null>(null);
 const [message,setMessage]=useState("");

 async function load(){
  const response=await fetch("/api/hq/support",{cache:"no-store"});
  if(response.status===403){setAuthorized(false);return}
  if(!response.ok)return;
  const data=await response.json();
  setTickets(data.tickets??[]);
  setAuthorized(true);
 }

 useEffect(()=>{void load()},[]);

 async function respond(id:string,resolve=false){
  const responseText=prompt(resolve?"Resolution message":"Support response");
  if(!responseText)return;
  const response=await fetch("/api/hq/support/"+id,{
   method:"PATCH",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({status:resolve?"RESOLVED":"RESPONDED",response:responseText})
  });
  const result=await response.json();
  setMessage(response.ok?(resolve?"Ticket resolved.":"Response saved."):result.error??"Unable to update ticket.");
  if(response.ok)await load();
 }

 if(authorized===false)return null;
 if(authorized===null)return <section className="hqPanel"><h2>Support Queue</h2><p>Checking support access…</p></section>;

 return <section className="hqPanel">
  <div className="hqPanelHead">
   <div><span className="eyebrow">SUPPORT</span><h2>Priority Support Queue</h2></div>
   <span>{tickets.length} open</span>
  </div>
  {!tickets.length&&<p>No open support tickets.</p>}
  <div className="hqHostList">
   {tickets.map(ticket=><article key={ticket.id}>
    <div>
     <b>{ticket.priority==="VIP"?"💫 VIP · ":""}{ticket.subject}</b>
     <span>@{ticket.user.username} · {ticket.category} · {ticket.status}</span>
     <small>{new Date(ticket.createdAt).toLocaleString()}</small>
     <p>{ticket.body}</p>
     {ticket.staffResponse&&<p><b>Last response:</b> {ticket.staffResponse}</p>}
    </div>
    <div className="hqHostActions">
     <button type="button" onClick={()=>respond(ticket.id,false)}>Respond</button>
     <button type="button" onClick={()=>respond(ticket.id,true)}>Resolve</button>
    </div>
   </article>)}
  </div>
  {message&&<p>{message}</p>}
 </section>;
}
