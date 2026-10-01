"use client";
import {useEffect,useState} from "react";

type Data={
 purchases:{
  id:string;
  amountCents:number;
  currency:string;
  coins:string;
  refundedCents:number;
  reversedCoins:string;
  status:string;
  createdAt:string;
  paidAt:string|null;
  refundedAt:string|null;
 }[];
 gifts:{
  id:string;
  giftName:string;
  creatorShareCents:number;
  status:string;
  createdAt:string;
  refundStatus:string|null;
 }[];
 battleEarnings:{
  id:string;
  kind:string;
  amountCents:number;
  status:string;
  createdAt:string;
  settledAt:string|null;
  battleId:string|null;
  giftTransactionId:string|null;
 }[];
 payouts:{
  id:string;
  amountCents:number;
  status:string;
  scheduledFor:string|null;
  paidAt:string|null;
  createdAt:string;
  providerTransactionId:string|null;
 }[];
};

const money=(c:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(c/100);

export function WalletHistory(){
 const [data,setData]=useState<Data|null>(null);

 useEffect(()=>{
  fetch("/api/wallet/history")
   .then(r=>r.json())
   .then(setData);
 },[]);

 if(!data)return null;

 const empty=data.purchases.length===0&&data.gifts.length===0&&data.battleEarnings.length===0&&data.payouts.length===0;

 return <section className="walletCard">
  <span className="eyebrow">History</span>
  <h2>Purchases, Gifts & Payouts</h2>

  {empty
   ?<p>No transactions yet.</p>
   :<div>
     {data.purchases.map(x=><p key={x.id}>
      <b>Coin Purchase</b> · {Number(x.coins).toLocaleString()} coins · {money(x.amountCents)}
      {" · "}{x.status.toLowerCase()}
      {x.refundedCents>0&&" · refunded "+money(x.refundedCents)}
      {" · "}{new Date(x.createdAt).toLocaleDateString()}
     </p>)}

     {data.gifts.map(x=><p key={x.id}>
      <b>{x.giftName}</b> · {money(x.creatorShareCents)}
      {" · "}{x.status.toLowerCase()}
      {" · "}{new Date(x.createdAt).toLocaleDateString()}
     </p>)}

     {data.battleEarnings.map(x=><p key={x.id}>
      <b>{x.kind.replaceAll("_"," ")}</b> · {money(x.amountCents)}
      {" · "}{x.status.toLowerCase()}
      {" · "}{new Date(x.createdAt).toLocaleDateString()}
     </p>)}

     {data.payouts.map(x=><p key={x.id}>
      <b>Payout</b> · {money(x.amountCents)}
      {" · "}{x.status.toLowerCase()}
      {x.providerTransactionId&&" · provider confirmed"}
      {" · "}{new Date(x.createdAt).toLocaleDateString()}
     </p>)}
    </div>}
 </section>;
}
