"use client";
import {useEffect,useState} from "react";
import {BATTLE_PASS_REWARDS} from "@/lib/battleRewardCatalog";

export function BattleRewardCenter(){
 const [data,setData]=useState<any>(null);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);

 async function load(){
  const response=await fetch("/api/battles/rewards",{cache:"no-store"});
  if(response.ok)setData(await response.json());
 }

 useEffect(()=>{void load()},[]);

 async function spin(){
  if(busy)return;
  setBusy(true);setMessage("");
  const response=await fetch("/api/battles/rewards",{method:"POST"});
  const result=await response.json();
  setMessage(response.ok?"🎡 "+result.reward.label+" unlocked!":result.error??"Unable to spin.");
  if(response.ok)await load();
  setBusy(false);
 }

 async function claimPass(level:number,track:"FREE"|"PREMIUM"){
  if(busy)return;
  setBusy(true);setMessage("");
  const response=await fetch("/api/battles/rewards/pass",{
   method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({level,track})
  });
  const result=await response.json();
  setMessage(response.ok?"🎫 "+result.label+" claimed!":result.error??"Unable to claim Battle Pass reward.");
  if(response.ok)await load();
  setBusy(false);
 }

 if(!data)return <section className="featureCard"><p>Loading battle rewards…</p></section>;

 const profile=data.profile;
 const pass=data.battlePass;
 const nextReward=BATTLE_PASS_REWARDS.find(item=>item.level>(pass?.level??1));

 return <section className="featureCard">
  <span className="eyebrow">BATTLE REWARD CENTER</span>
  <h2>{profile?.rankTitle??"BRONZE"} Rank</h2>
  <div className="statsRow">
   <span>Wins <b>{profile?.wins??0}</b></span>
   <span>Current streak <b>{profile?.currentWinStreak??0}</b></span>
   <span>Best streak <b>{profile?.bestWinStreak??0}</b></span>
   <span>Battle Pass <b>Lv. {pass?.level??1}</b></span>
  </div>

  <div className="featureCard">
   <h3>Winner’s Wheel</h3>
   <p>{data.wheelSpins} spin{data.wheelSpins===1?"":"s"} available.</p>
   <button type="button" onClick={spin} disabled={busy||data.wheelSpins<1}>{busy?"Spinning…":"Spin Winner’s Wheel"}</button>
   <small>Wheel rewards are platform rewards only; random cash prizes are not enabled.</small>
  </div>

  <div className="featureCard">
   <h3>Reward Balances</h3>
   <p>💎 Gems: {(data.balances?.GEM??0).toLocaleString()}</p>
   <p>⚔️ Battle Tokens: {(data.balances?.BATTLE_TOKEN??0).toLocaleString()}</p>
   <p>🃏 Double-Point Cards: {(data.balances?.CARD_DOUBLE_POINT??0).toLocaleString()}</p>
   <p>🛡️ Shield Cards: {(data.balances?.CARD_SHIELD??0).toLocaleString()}</p>
  </div>

  <div className="featureCard">
   <h3>Battle Pass</h3>
   <p>{(pass?.freeXp??0).toLocaleString()} XP · Level {pass?.level??1}</p>
   <p>Free Track active{pass?.premiumActive?" · Premium Track active":" · Premium Track not activated"}</p>
   {nextReward&&<p>Next reward milestone: Level {nextReward.level} · {nextReward.free}</p>}
   <div className="battlePassRewards">
    {BATTLE_PASS_REWARDS.map(reward=>{
     const freeKey="BATTLE_PASS_FREE_L"+reward.level;
     const premiumKey="BATTLE_PASS_PREMIUM_L"+reward.level;
     const unlocked=(pass?.level??1)>=reward.level;
     const freeClaimed=data.passClaims?.includes(freeKey);
     const premiumClaimed=data.passClaims?.includes(premiumKey);
     return <article key={reward.level} className="searchResult">
      <b>Level {reward.level}</b>
      <p>Free: {reward.free}</p>
      <button type="button" disabled={!unlocked||freeClaimed} onClick={()=>claimPass(reward.level,"FREE")}>{freeClaimed?"Claimed":unlocked?"Claim Free":"Locked"}</button>
      <p>Premium: {reward.premium}</p>
      <button type="button" disabled={!unlocked||!pass?.premiumActive||premiumClaimed} onClick={()=>claimPass(reward.level,"PREMIUM")}>{premiumClaimed?"Claimed":!pass?.premiumActive?"Premium Inactive":unlocked?"Claim Premium":"Locked"}</button>
     </article>;
    })}
   </div>
  </div>

  {data.badges?.length>0&&<div className="featureCard">
   <h3>Battle Badges</h3>
   {data.badges.map((badge:any)=><span key={badge.id}>{badge.icon??"🎖️"} {badge.name} </span>)}
  </div>}

  {message&&<p>{message}</p>}
 </section>;
}
