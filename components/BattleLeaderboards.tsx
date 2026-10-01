"use client";
import {useEffect,useState} from "react";
import Link from "next/link";

const SCOPES=[
 ["daily","Daily"],
 ["weekly","Weekly"],
 ["monthly","Monthly"],
 ["regional","Regional"],
 ["global","Global"]
] as const;

export function BattleLeaderboards(){
 const [scope,setScope]=useState<(typeof SCOPES)[number][0]>("daily");
 const [data,setData]=useState<any>(null);
 const [busy,setBusy]=useState(false);

 useEffect(()=>{
  let active=true;
  setBusy(true);
  fetch("/api/battles/leaderboard?scope="+scope,{cache:"no-store"})
   .then(r=>r.json())
   .then(value=>{if(active)setData(value)})
   .finally(()=>{if(active)setBusy(false)});
  return()=>{active=false};
 },[scope]);

 return <section className="featureCard">
  <div className="moderatorPanelHead">
   <div><span className="eyebrow">BATTLE RANKINGS</span><h2>Climb the board.</h2></div>
   <div>{SCOPES.map(([key,label])=><button type="button" key={key} onClick={()=>setScope(key)} aria-pressed={scope===key}>{label}</button>)}</div>
  </div>
  {busy&&<p>Loading rankings…</p>}
  {!busy&&data?.needsRegion&&<p>Regional rankings unlock once a region is added to the account profile.</p>}
  {!busy&&data&&!data.needsRegion&&data.rankings?.length===0&&<p>No completed battles in this ranking window yet.</p>}
  {!busy&&data?.rankings?.length>0&&<div className="battleLeaderboard">
   {data.rankings.map((row:any)=><Link key={row.userId} href={"/u/"+row.username} className="searchResult">
    <b>#{row.rank} {row.displayName}</b>
    <span>@{row.username} · {row.profile?.rankTitle??"BRONZE"}</span>
    <p>{Number(row.rankingPoints).toLocaleString()} ranking pts · {row.profile?.wins??0} wins · 🔥 {row.profile?.currentWinStreak??0} streak</p>
   </Link>)}
  </div>}
 </section>;
}
