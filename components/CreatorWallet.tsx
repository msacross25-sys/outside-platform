"use client";

import {useEffect,useState} from "react";
import Link from "next/link";

const usd=(c:number)=>"$"+(c/100).toFixed(2);

export function CreatorWallet(){
 const [d,setD]=useState<any>(null);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);

 const load=()=>fetch("/api/wallet").then(r=>r.ok?r.json():null).then(setD);
 useEffect(()=>{void load()},[]);

 async function onboarding(){
  if(busy)return;
  setBusy(true);setMessage("");
  const r=await fetch("/api/wallet/payout/onboarding",{method:"POST"});
  const x=await r.json();
  if(!r.ok){
   setMessage(x.error??"Unable to prepare payout onboarding.");
   setBusy(false);
   return;
  }
  if(x.onboardingUrl){
   window.location.assign(x.onboardingUrl);
   return;
  }
  setMessage(x.taxVerificationRequired
   ?"Identity/payout onboarding is complete. Tax verification is still required before cash payouts."
   :"Payout onboarding is complete.");
  setBusy(false);
  await load();
 }

 async function payout(){
  if(busy)return;
  setBusy(true);setMessage("");
  const r=await fetch("/api/wallet/payout",{method:"POST"});
  const x=await r.json();
  setMessage(r.ok?"Payout reserved for the next cycle.":x.error??"Unable to reserve payout.");
  setBusy(false);
  if(r.ok)await load();
 }

 if(!d)return <section className="featureCard"><p>Loading Creator Wallet…</p></section>;

 const e=d.earnings;
 const account=d.payoutAccount;
 const providerReady=Boolean(account?.payoutsEnabled&&account?.detailsSubmitted);
 const identityReady=account?.identityStatus==="VERIFIED";
 const taxReady=account?.taxStatus==="VERIFIED";
 const minimumReady=e.availableCents>=e.minimumPayoutCents;

 return <section className="featureCard">
  <span className="eyebrow">Creator Wallet</span>
  <h2>{usd(e.availableCents)} Available</h2>

  <div className="statsRow">
   <span>Pending <b>{usd(e.pendingCents)}</b></span>
   <span>Total Earned <b>{usd(e.totalEarnedCents)}</b></span>
   <span>Battle Settled <b>{usd(e.battleSettledCents)}</b></span>
   <span>Battle Pending <b>{usd(e.battlePendingCents)}</b></span>
   <span>Coins <b>{d.coinBalance}</b></span>
   <span>Minimum <b>{usd(e.minimumPayoutCents)}</b></span>
  </div>

  <h3>Payout readiness</h3>
  <p>Provider onboarding: <b>{providerReady?"Complete":"Required"}</b></p>
  <p>Identity verification: <b>{identityReady?"Verified":"Required"}</b></p>
  <p>Tax verification: <b>{taxReady?"Verified":"Required"}</b></p>
  <p>Minimum balance: <b>{minimumReady?"Reached":"Not reached"}</b></p>

  {!providerReady&&<button disabled={busy} onClick={onboarding}>{busy?"Opening…":"Start / continue payout onboarding"}</button>}
  {providerReady&&!taxReady&&<p>Cash payouts stay locked until tax onboarding is verified through the approved provider. OUTSiiDE does not ask you to type an SSN or EIN into this wallet.</p>}
  {e.nextPayout&&<p>Next payout: {usd(e.nextPayout.amountCents)} · {e.nextPayout.status}</p>}
  <p>Normal Creator payout cycle: every 2 weeks. Battle payout rules remain separate where required by the Battle program.</p>

  {e.payoutEligible&&!e.nextPayout&&<button disabled={busy} onClick={payout}>{busy?"Working…":"Reserve next payout"}</button>}
  {!e.payoutEligible&&minimumReady&&providerReady&&<p>Your balance is high enough, but compliance requirements must be complete before OUTSiiDE can release funds.</p>}
  <p><Link href="/legal/creator-terms">Creator Terms</Link> · <Link href="/legal/refund">Refund Policy</Link></p>
  {message&&<p>{message}</p>}
 </section>;
}
