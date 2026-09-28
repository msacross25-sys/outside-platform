"use client";
import { useEffect,useState } from "react";
type WalletData={coinBalance:string;earnings:{availableCents:number;pendingCents:number;totalEarnedCents:number;minimumPayoutCents:number;payoutEligible:boolean;nextPayout:{scheduledFor:string|null,status:string}|null}};
const money=(c:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(c/100);
export function WalletPanel(){
 const [data,setData]=useState<WalletData|null>(null),[error,setError]=useState("");
 useEffect(()=>{fetch("/api/wallet").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error??"Unable to load wallet.");setData(d)}).catch(e=>setError(e.message))},[]);
 if(error)return <p>{error}</p>;if(!data)return <p>Loading wallet…</p>;
 const e=data.earnings;
 return <div className="walletGrid"><section className="walletCard"><span className="eyebrow">Coin Wallet</span><h2>{Number(data.coinBalance).toLocaleString()} coins</h2><p>Coins are used for OUTSiiDE gifts.</p><button disabled>Buy Coins · provider setup pending</button></section><section className="walletCard"><span className="eyebrow">Creator Wallet</span><div className="walletStats"><div><small>Available</small><b>{money(e.availableCents)}</b></div><div><small>Pending</small><b>{money(e.pendingCents)}</b></div><div><small>Total Earned</small><b>{money(e.totalEarnedCents)}</b></div><div><small>Minimum Payout</small><b>{money(e.minimumPayoutCents)}</b></div></div><p>{e.payoutEligible?"Eligible for the next payout cycle.":`Earn ${money(Math.max(0,e.minimumPayoutCents-e.availableCents))} more to reach payout minimum.`}</p>{e.nextPayout&&<p>Next payout: {e.nextPayout.scheduledFor?new Date(e.nextPayout.scheduledFor).toLocaleDateString():"Scheduling"} · {e.nextPayout.status.toLowerCase()}</p>}</section></div>
}