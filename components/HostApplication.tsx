"use client";
import { useEffect,useState } from "react";
type HostState={followers:number;verifiedViewingHours:number;goodStanding:boolean;eligible:boolean;application:{status:string}|null};
export function HostApplication(){
 const [state,setState]=useState<HostState|null>(null),[message,setMessage]=useState(""),[accepted,setAccepted]=useState(false);
 async function load(){const r=await fetch("/api/host/apply");const d=await r.json();if(r.ok)setState(d);else setMessage(d.error??"Unable to load host eligibility.")}
 useEffect(()=>{load()},[]);
 async function apply(){setMessage("");const r=await fetch("/api/host/apply",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({acceptHostAgreement:accepted})});const data=await r.json();if(!r.ok){setMessage(data.error??"Unable to apply.");return}setMessage("Application submitted for review.");await load()}
 if(!state)return <p>{message||"Loading host eligibility…"}</p>;
 const blocked=state.application?.status==="PENDING"||state.application?.status==="APPROVED";
 return <div className="featureCard"><span className="eyebrow">Host Progress</span><h2>{state.application?.status==="APPROVED"?"Host Approved":state.eligible?"Host Eligible":"Host Requirements"}</h2><p><b>Followers</b><br/>{state.followers.toLocaleString()} / 2,500</p><p><b>Verified Viewing Hours</b><br/>{state.verifiedViewingHours.toLocaleString(undefined,{maximumFractionDigits:1})} / 3,000</p><p><b>Account Standing</b><br/>{state.goodStanding?"✓ Good Standing":"Not in good standing"}</p><p><b>Host Application</b><br/>{state.application?.status??(state.eligible?"Eligible to Apply":"Not Yet Eligible")}</p><label><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> I accept the OUTSiiDE Host Agreement and Host responsibilities.</label><button disabled={!state.eligible||blocked||!accepted} onClick={apply}>Apply to Become a Host</button>{message&&<p>{message}</p>}</div>
}