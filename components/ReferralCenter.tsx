"use client";
import {FormEvent,useEffect,useState} from "react";

const money=(c:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(c/100);

export function ReferralCenter(){
 const [data,setData]=useState<any>(null);
 const [message,setMessage]=useState("");

 async function load(){
  const response=await fetch("/api/referrals",{cache:"no-store"});
  if(response.ok)setData(await response.json());
 }
 useEffect(()=>{void load()},[]);

 async function apply(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const form=new FormData(e.currentTarget);
  const response=await fetch("/api/referrals",{
   method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({code:form.get("code")})
  });
  const result=await response.json();
  setMessage(response.ok?"Referral attached.":result.error??"Unable to attach referral.");
  if(response.ok){e.currentTarget.reset();await load()}
 }

 async function copy(){
  if(!data?.code)return;
  await navigator.clipboard.writeText(data.code);
  setMessage("Referral code copied.");
 }

 if(!data)return <section className="featureCard"><p>Loading referrals…</p></section>;

 return <div>
  <section className="featureCard">
   <span className="eyebrow">YOUR REFERRAL CODE</span>
   <h2>{data.code}</h2>
   <p>{data.referrals} referred account{data.referrals===1?"":"s"} · {money(data.referralEarningsCents)} battle referral earnings</p>
   <button type="button" onClick={copy}>Copy Code</button>
  </section>

  <section className="featureCard">
   <span className="eyebrow">REFERRED BY</span>
   {data.referredBy
    ?<p>{data.referredBy.displayName} · @{data.referredBy.username}</p>
    :<form onSubmit={apply}>
      <label>Referral code<input name="code" maxLength={32} placeholder="OUT-XXXXXXXX" required/></label>
      <button>Apply Referral</button>
      <small>Referral codes must be attached before any coin purchase or gifting begins.</small>
     </form>}
  </section>
  {message&&<p>{message}</p>}
 </div>;
}
