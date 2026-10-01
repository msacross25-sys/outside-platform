"use client";
import {useEffect,useState} from "react";

type CoinPackage={key:string;label:string;amountCents:number;coins:string};
type WalletData={
 coinBalance:string;
 coinPackages:CoinPackage[];
 payoutAccount:{provider:string;payoutsEnabled:boolean;detailsSubmitted:boolean;onboardingCompleteAt:string|null}|null;
 earnings:{
  availableCents:number;
  pendingCents:number;
  totalEarnedCents:number;
  minimumPayoutCents:number;
  payoutEligible:boolean;
  nextPayout:{scheduledFor:string|null;status:string}|null;
 };
};

const money=(c:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(c/100);

export function WalletPanel(){
 const [data,setData]=useState<WalletData|null>(null);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState("");

 async function load(){
  try{
   const r=await fetch("/api/wallet",{cache:"no-store"});
   const d=await r.json();
   if(!r.ok)throw new Error(d.error??"Unable to load wallet.");
   setData(d);
  }catch(e){
   setError(e instanceof Error?e.message:"Unable to load wallet.");
  }
 }

 useEffect(()=>{void load()},[]);

 async function buy(packageKey:string){
  setBusy("buy:"+packageKey);
  setError("");
  try{
   const r=await fetch("/api/wallet/checkout",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({packageKey})
   });
   const d=await r.json();
   if(!r.ok)throw new Error(d.error??"Checkout could not be created.");
   location.assign(d.checkoutUrl);
  }catch(e){
   setError(e instanceof Error?e.message:"Checkout could not be created.");
   setBusy("");
  }
 }

 async function payoutSetup(){
  setBusy("payout");
  setError("");
  try{
   const r=await fetch("/api/wallet/payout/onboarding",{method:"POST"});
   const d=await r.json();
   if(!r.ok)throw new Error(d.error??"Payout onboarding could not be prepared.");
   if(d.onboardingComplete){
    await load();
    setBusy("");
    return;
   }
   location.assign(d.onboardingUrl);
  }catch(e){
   setError(e instanceof Error?e.message:"Payout onboarding could not be prepared.");
   setBusy("");
  }
 }

 async function refreshPayout(){
  setBusy("refresh");
  try{
   await fetch("/api/wallet/payout/onboarding",{cache:"no-store"});
   await load();
  }finally{
   setBusy("");
  }
 }

 if(error&&!data)return <p>{error}</p>;
 if(!data)return <p>Loading wallet…</p>;

 const e=data.earnings;
 const payoutReady=Boolean(data.payoutAccount?.payoutsEnabled&&data.payoutAccount?.detailsSubmitted);
 const remaining=Math.max(0,e.minimumPayoutCents-e.availableCents);

 return <div className="walletGrid">
  <section className="walletCard">
   <span className="eyebrow">Coin Wallet</span>
   <h2>{Number(data.coinBalance).toLocaleString()} coins</h2>
   <p>Coins are used for OUTSiiDE gifts. Purchases are available to accounts age 18+.</p>
   <div className="walletStats">
    {data.coinPackages.map(pack=><button
     key={pack.key}
     disabled={Boolean(busy)}
     onClick={()=>buy(pack.key)}
    >
     {Number(pack.coins).toLocaleString()} coins · {money(pack.amountCents)}
    </button>)}
   </div>
  </section>

  <section className="walletCard">
   <span className="eyebrow">Creator Wallet</span>
   <div className="walletStats">
    <div><small>Available</small><b>{money(e.availableCents)}</b></div>
    <div><small>Pending</small><b>{money(e.pendingCents)}</b></div>
    <div><small>Total Earned</small><b>{money(e.totalEarnedCents)}</b></div>
    <div><small>Minimum Payout</small><b>{money(e.minimumPayoutCents)}</b></div>
   </div>

   <p>{e.payoutEligible
    ?"Eligible for the next payout cycle once payout onboarding is complete."
    :"Earn "+money(remaining)+" more to reach payout minimum."}</p>

   {payoutReady
    ?<p>✓ Creator payouts connected.</p>
    :<button disabled={Boolean(busy)} onClick={payoutSetup}>Set Up Creator Payouts</button>}

   {data.payoutAccount&&!payoutReady&&
    <button disabled={Boolean(busy)} onClick={refreshPayout}>Refresh Payout Status</button>}

   {e.nextPayout&&<p>
    Next payout: {e.nextPayout.scheduledFor?new Date(e.nextPayout.scheduledFor).toLocaleDateString():"Scheduling"}
    {" · "}{e.nextPayout.status.toLowerCase()}
   </p>}

   {error&&<p>{error}</p>}
  </section>
 </div>;
}
