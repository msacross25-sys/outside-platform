"use client";
import {useEffect,useState} from "react";

const usd=(c:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(c/100);

export function HQBattleEconomy(){
 const [data,setData]=useState<any>(null);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);

 async function load(){
  const response=await fetch("/api/hq/battles",{cache:"no-store"});
  if(response.ok)setData(await response.json());
 }

 useEffect(()=>{void load()},[]);

 async function rollup(){
  setBusy(true);setMessage("");
  const response=await fetch("/api/hq/battles",{method:"POST"});
  const result=await response.json();
  setMessage(response.ok?"Battle rollups completed.":result.error??"Unable to run battle rollups.");
  if(response.ok)await load();
  setBusy(false);
 }

 if(!data)return <section className="featureCard"><h2>Battle Economy</h2><p>Finance-authorized data only.</p></section>;

 return <section className="featureCard">
  <span className="eyebrow">BATTLE ECONOMY HQ</span>
  <h2>Rewards, Reserves & Rollups</h2>
  <p>Live battles: {data.liveBattles}</p>
  <p>Pending creator battle earnings: {data.pendingBattleEarningsCount} · {usd(data.pendingBattleEarningsCents)}</p>
  <p>Weekly jackpot reserve: {usd(data.reserves?.WEEKLY_JACKPOT_RESERVE??0)}</p>
  <p>Season championship reserve: {usd(data.reserves?.SEASON_CHAMPIONSHIP_RESERVE??0)}</p>
  <button type="button" onClick={rollup} disabled={busy}>{busy?"Running…":"Run Battle Rollups"}</button>
  {data.recentAwards?.length>0&&<details><summary>Recent rollups</summary>{data.recentAwards.map((row:any)=><p key={row.id}>{row.kind} · {new Date(row.createdAt).toLocaleString()}</p>)}</details>}
  {message&&<p>{message}</p>}
 </section>;
}
