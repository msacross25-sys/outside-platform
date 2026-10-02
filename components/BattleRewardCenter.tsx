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

 async function chooseTitle(title:"BATTLE_KING"|"QUEEN_OF_BATTLES"){
  setMessage("");
  const response=await fetch("/api/battles/title",{
   method:"PATCH",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({title})
  });
  const result=await response.json();
  setMessage(response.ok?"👑 Battle title updated.":result.error??"Unable to update title.");
  if(response.ok)await load();
 }

 async function clearTitle(){
  setMessage("");
  const response=await fetch("/api/battles/title",{method:"DELETE"});
  const result=await response.json();
  setMessage(response.ok?"Battle title cleared.":result.error??"Unable to clear title.");
  if(response.ok)await load();
 }

 async function spin(){
  if(busy)return;
  setBusy(true);setMessage("");
  const response=await fetch("/api/battles/rewards",{method:"POST"});
  const result=await response.json();
  setMessage(response.ok?"🎡 "+result.reward.label+" unlocked!":result.error??"Unable to spin.");
  if(response.ok)await load();
  setBusy(false);
 }

 async function activatePremium(){
  if(busy)return;
  setBusy(true);setMessage("");
  const response=await fetch("/api/battles/rewards/pass/checkout",{method:"POST"});
  const result=await response.json();
  if(response.ok&&result.checkoutUrl){
   window.location.href=result.checkoutUrl;
   return;
  }
  setMessage(result.active?"Premium Battle Pass is already active.":result.error??"Unable to start Premium Battle Pass checkout.");
  if(result.active)await load();
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
   <span>VIP <b>{profile?.vipActive?"ACTIVE":"—"}</b></span>
  </div>

  {profile?.vipActive&&<div className="featureCard"><h3>💫 Battle VIP Active</h3><p>Your 25-win streak unlocked VIP through {new Date(profile.vipUntil).toLocaleDateString()}.</p></div>}

  <div className="featureCard">
   <h3>Winner’s Wheel</h3>
   <p>{data.wheelSpins} spin{data.wheelSpins===1?"":"s"} available.</p>
   <button type="button" onClick={spin} disabled={busy||data.wheelSpins<1}>{busy?"Spinning…":"Spin Winner’s Wheel"}</button>
   <small>Wheel rewards are platform rewards only; random cash prizes are not enabled.</small>
  </div>

  {(profile?.wins??0)>=25&&<div className="featureCard">
   <h3>Royal Battle Title</h3>
   <p>Choose how your unlocked royal title appears on OUTSiiDE.</p>
   <button type="button" onClick={()=>chooseTitle("BATTLE_KING")} aria-pressed={profile?.selectedTitle==="BATTLE_KING"}>👑 Battle King</button>
   <button type="button" onClick={()=>chooseTitle("QUEEN_OF_BATTLES")} aria-pressed={profile?.selectedTitle==="QUEEN_OF_BATTLES"}>👑 Queen of Battles</button>
   {profile?.selectedTitle&&<button type="button" onClick={clearTitle}>Clear Title</button>}
  </div>}

  <div className="featureCard">
   <h3>Reward Balances</h3>
   <p>💎 Gems: {(data.balances?.GEM??0).toLocaleString()}</p>
   <p>🔷 Diamonds: {(data.balances?.DIAMOND??0).toLocaleString()}</p>
   <p>⚔️ Battle Tokens: {(data.balances?.BATTLE_TOKEN??0).toLocaleString()}</p>
   <p>🃏 Double-Point Cards: {(data.balances?.CARD_DOUBLE_POINT??0).toLocaleString()}</p>
   <p>🛡️ Shield Cards: {(data.balances?.CARD_SHIELD??0).toLocaleString()}</p>
   <p>🔁 Rematch Cards: {(data.balances?.CARD_REMATCH??0).toLocaleString()}</p>
  </div>

  <div className="featureCard">
   <h3>Battle Pass</h3>
   <p>{(pass?.freeXp??0).toLocaleString()} XP · Level {pass?.level??1}</p>
   <p>Free Track active{pass?.premiumActive?" · Premium Track active":" · Premium Track not activated"}</p>
   {!data.premiumPass?.active&&<button type="button" onClick={activatePremium} disabled={busy}>
    Activate Premium · ${((data.premiumPass?.priceCents??999)/100).toFixed(2)} / season
   </button>}
   {data.premiumPass?.active&&<p>💫 Premium active for {data.premiumPass.seasonKey}</p>}
   {data.premiumPass?.purchaseStatus==="PENDING"&&!data.premiumPass?.active&&<small>Payment is pending confirmation.</small>}
   {data.premiumPass?.purchaseStatus==="REFUNDED"&&<small>The previous Premium purchase for this season was refunded.</small>}
   {data.premiumPass?.purchaseStatus==="CHARGEBACK"&&<small>The previous Premium purchase for this season was reversed.</small>}
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
