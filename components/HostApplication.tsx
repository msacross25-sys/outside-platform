"use client";
import { useEffect,useState } from "react";

type HostState={followers:number;eligible:boolean;application:{status:string}|null};
export function HostApplication(){
 const [state,setState]=useState<HostState|null>(null);
 const [message,setMessage]=useState("");
 async function load(){const r=await fetch("/api/host/apply");if(r.ok)setState(await r.json())}
 useEffect(()=>{load()},[]);
 async function apply(){setMessage("");const r=await fetch("/api/host/apply",{method:"POST"});const data=await r.json();if(!r.ok){setMessage(data.error??"Unable to apply.");return}setMessage("Application submitted for review.");await load()}
 if(!state)return <p>Loading host eligibility…</p>;
 return <div className="featureCard"><h2>Host Requirements</h2><p>{state.followers} / 500 followers</p><p>Account in good standing</p><p>Application and approval required</p>{state.application?<p>Application status: <b>{state.application.status}</b></p>:null}<button disabled={!state.eligible||state.application?.status==="PENDING"||state.application?.status==="APPROVED"} onClick={apply}>Apply to Become a Host</button>{message&&<p>{message}</p>}</div>
}