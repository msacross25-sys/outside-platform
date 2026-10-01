"use client";

import {useEffect,useMemo,useState} from "react";
import {
 BATTLE_DURATIONS,
 BATTLE_MODES,
 BATTLE_THEMES,
 MAX_BATTLE_TEAM_SIZE
} from "@/lib/battles";

type Member={userId:string;role:string;user:{username:string;displayName:string}};
type Team={id:string;side:number;memberIds:string[];score:number;activeMultiplier:number;multiplierExpiresAt:string|null};
type Battle={id:string;mode:string;theme:string;durationMinutes:number;status:string;startedAt:string|null;endedAt:string|null;teams:Team[]};
type BattleResponse={battle:Battle|null;endsAt?:string;surgeStartsAt?:string;expired?:boolean;recent?:Battle|null};
type Tournament={id:string;name:string;status:string;currentRound:number};

export function BattleCenter({slug,members,host,status,meId}:{slug:string;members:Member[];host:boolean;status:string;meId:string}){
 const stage=useMemo(()=>members.filter(member=>["HOST","COHOST","SPEAKER"].includes(member.role)),[members]);
 const [battle,setBattle]=useState<Battle|null>(null);
 const [lastResult,setLastResult]=useState<Battle|null>(null);
 const [endsAt,setEndsAt]=useState<string|null>(null);
 const [surgeStartsAt,setSurgeStartsAt]=useState<string|null>(null);
 const [now,setNow]=useState<number>(0);
 const [mode,setMode]=useState("ONE_V_ONE");
 const [theme,setTheme]=useState<string>(BATTLE_THEMES[0].key);
 const [duration,setDuration]=useState<number>(5);
 const [left,setLeft]=useState<string[]>([]);
 const [right,setRight]=useState<string[]>([]);
 const [message,setMessage]=useState("");
 const [tournaments,setTournaments]=useState<Tournament[]>([]);
 const [tournamentId,setTournamentId]=useState("");
 const [roundNumber,setRoundNumber]=useState(1);
 const [matchNumber,setMatchNumber]=useState(1);

 async function load(){
  const response=await fetch(`/api/porch/${slug}/battle`,{cache:"no-store"});
  if(!response.ok)return;
  const data:BattleResponse=await response.json();
  setNow(Date.now());
  if(data.expired&&data.battle){
   setLastResult(data.battle);
   setBattle(null);
   setEndsAt(null);
   setSurgeStartsAt(null);
   return;
  }
  if(data.battle?.status==="LIVE"){
   setBattle(data.battle);
   setEndsAt(data.endsAt??null);
   setSurgeStartsAt(data.surgeStartsAt??null);
  }else{
   setBattle(null);
   setEndsAt(null);
   setSurgeStartsAt(null);
   if(data.recent)setLastResult(data.recent);
  }
 }

 useEffect(()=>{
  if(status!=="LIVE")return;
  void load();
  const refresh=window.setInterval(()=>void load(),5000);
  const clock=window.setInterval(()=>setNow(Date.now()),1000);
  return()=>{clearInterval(refresh);clearInterval(clock)};
 },[slug,status]);

 useEffect(()=>{
  if(!host)return;
  fetch("/api/battles/tournaments?mine=1&status=LIVE",{cache:"no-store"})
   .then(r=>r.ok?r.json():null)
   .then(data=>setTournaments(data?.tournaments??[]))
   .catch(()=>{});
 },[host]);

 function toggle(side:"left"|"right",userId:string){
  const mine=side==="left"?left:right;
  const other=side==="left"?right:left;
  if(other.includes(userId)){setMessage("A participant can only be on one side.");return}
  const next=mine.includes(userId)?mine.filter(id=>id!==userId):[...mine,userId];
  if(next.length>MAX_BATTLE_TEAM_SIZE){setMessage("Each side can have up to 5 people.");return}
  setMessage("");
  if(side==="left")setLeft(next);else setRight(next);
 }

 async function start(){
  setMessage("");
  setLastResult(null);
  if(mode==="ONE_V_ONE"&&(left.length!==1||right.length!==1)){
   setMessage("1 vs 1 requires exactly one person on each side.");
   return;
  }
  if(mode==="TOURNAMENT"&&!tournamentId){
   setMessage("Choose a live tournament first.");
   return;
  }

  const response=await fetch(`/api/porch/${slug}/battle`,{
   method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({
    mode,
    theme,
    durationMinutes:duration,
    left,
    right,
    tournamentId:mode==="TOURNAMENT"?tournamentId:null,
    roundNumber:mode==="TOURNAMENT"?roundNumber:null,
    matchNumber:mode==="TOURNAMENT"?matchNumber:null
   })
  });
  const data=await response.json();
  if(!response.ok){setMessage(data.error??"Unable to start battle.");return}
  setBattle(data.battle);
  const startMs=data.battle?.startedAt?new Date(data.battle.startedAt).getTime():Date.now();
  const endMs=startMs+data.battle.durationMinutes*60000;
  setEndsAt(new Date(endMs).toISOString());
  setSurgeStartsAt(new Date(endMs-30000).toISOString());
  setMessage("Battle started.");
 }

 async function stop(){
  setMessage("");
  const response=await fetch(`/api/porch/${slug}/battle`,{method:"PATCH"});
  const data=await response.json();
  if(!response.ok){setMessage(data.error??"Unable to end battle.");return}
  if(data.battle)setLastResult(data.battle);
  setBattle(null);setEndsAt(null);setSurgeStartsAt(null);setMessage("Battle ended.");
 }

 async function useDoublePointCard(){
  setMessage("");
  const response=await fetch(`/api/porch/${slug}/battle/card`,{
   method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({card:"DOUBLE_POINT"})
  });
  const data=await response.json();
  if(!response.ok){setMessage(data.error??"Unable to use battle card.");return}
  setMessage("🃏 Double-Point Card activated for Side "+data.side+" for 60 seconds.");
  await load();
 }

 async function useShieldCard(){
  setMessage("");
  const response=await fetch(`/api/porch/${slug}/battle/card`,{
   method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({card:"SHIELD"})
  });
  const data=await response.json();
  if(!response.ok){setMessage(data.error??"Unable to use Shield Card.");return}
  setMessage("🛡️ Shield Card active for this match. A loss will not reset your win streak.");
 }

 if(status!=="LIVE")return null;

 const activeTheme=BATTLE_THEMES.find(item=>item.key===battle?.theme);
 const resultTheme=BATTLE_THEMES.find(item=>item.key===lastResult?.theme);
 const secondsLeft=endsAt?Math.max(0,Math.ceil((new Date(endsAt).getTime()-now)/1000)):null;
 const timeLeft=secondsLeft===null?"":`${Math.floor(secondsLeft/60)}:${String(secondsLeft%60).padStart(2,"0")}`;
 const surgeActive=!!surgeStartsAt&&now>=new Date(surgeStartsAt).getTime()&&(secondsLeft??0)>0;
 const nameFor=(id:string)=>members.find(member=>member.userId===id)?.user.displayName??"Participant";
 const leftTeam=battle?.teams.find(team=>team.side===1);
 const rightTeam=battle?.teams.find(team=>team.side===2);
 const myTeam=battle?.teams.find(team=>team.memberIds.includes(meId));
 const myCardActive=!!myTeam?.multiplierExpiresAt&&new Date(myTeam.multiplierExpiresAt).getTime()>now&&myTeam.activeMultiplier>1;
 const resultLeft=lastResult?.teams.find(team=>team.side===1);
 const resultRight=lastResult?.teams.find(team=>team.side===2);
 const winner=resultLeft&&resultRight
  ?resultLeft.score===resultRight.score?"Tie battle":resultLeft.score>resultRight.score?"Side 1 wins":"Side 2 wins"
  :"";

 return <section className="featureCard">
  <span className="eyebrow">OUTSiiDE BATTLE</span>
  {battle?.status==="LIVE"?<>
   <h2>{activeTheme?.icon??"⚡"} {activeTheme?.name??"Live Battle"}</h2>
   <p>{battle.mode==="ONE_V_ONE"?"1 vs 1":battle.mode==="TOURNAMENT"?"Tournament Match":"Team vs Team"} · <b>{timeLeft||`${battle.durationMinutes}:00`}</b> remaining</p>
   {surgeActive&&<div className="featureCard"><b>⚡ LAST MINUTE SURGE · 2× POINTS</b><p>Every gift counts double for the final 30 seconds.</p></div>}
   <div className="battleTeams">
    <article><h3>Side 1</h3>{leftTeam?.multiplierExpiresAt&&new Date(leftTeam.multiplierExpiresAt).getTime()>now&&leftTeam.activeMultiplier>1&&<p>🃏 {leftTeam.activeMultiplier}× card active</p>}{(leftTeam?.memberIds??[]).map(id=><p key={id}>{nameFor(id)}</p>)}<b>Score: {(leftTeam?.score??0).toLocaleString()}</b></article>
    <article><h3>Side 2</h3>{rightTeam?.multiplierExpiresAt&&new Date(rightTeam.multiplierExpiresAt).getTime()>now&&rightTeam.activeMultiplier>1&&<p>🃏 {rightTeam.activeMultiplier}× card active</p>}{(rightTeam?.memberIds??[]).map(id=><p key={id}>{nameFor(id)}</p>)}<b>Score: {(rightTeam?.score??0).toLocaleString()}</b></article>
   </div>
   {myTeam&&<><button type="button" onClick={useDoublePointCard} disabled={myCardActive}>{myCardActive?"Double-Point Card Active":"Use Double-Point Card"}</button><button type="button" onClick={useShieldCard}>Use Shield Card</button></>}{host&&<button type="button" onClick={stop}>End Battle</button>}
  </>:<>
   {lastResult&&<div className="battleResult">
    <h2>{resultTheme?.icon??"🏁"} {winner}</h2>
    <p>Final score: <b>{(resultLeft?.score??0).toLocaleString()}</b> — <b>{(resultRight?.score??0).toLocaleString()}</b></p>
   </div>}
   {host?<><h2>Start a battle</h2>
    <label>Mode <select value={mode} onChange={event=>{setMode(event.target.value);setLeft([]);setRight([])}}>
     {BATTLE_MODES.map(item=><option key={item.key} value={item.key}>{item.name}</option>)}
    </select></label>
    <label>Theme <select value={theme} onChange={event=>setTheme(event.target.value)}>{BATTLE_THEMES.map(item=><option key={item.key} value={item.key}>{item.icon} {item.name}</option>)}</select></label>
    <label>Timer <select value={duration} onChange={event=>setDuration(Number(event.target.value))}>{BATTLE_DURATIONS.map(minutes=><option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></label>
    {mode==="TOURNAMENT"&&<div className="featureCard">
     <label>Tournament <select value={tournamentId} onChange={event=>{setTournamentId(event.target.value);const t=tournaments.find(x=>x.id===event.target.value);if(t)setRoundNumber(t.currentRound)}}>
      <option value="">Choose tournament</option>
      {tournaments.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
     </select></label>
     <label>Round <input type="number" min="1" value={roundNumber} onChange={event=>setRoundNumber(Math.max(1,Number(event.target.value)))}/></label>
     <label>Match <input type="number" min="1" value={matchNumber} onChange={event=>setMatchNumber(Math.max(1,Number(event.target.value)))}/></label>
    </div>}
    <p>{mode==="ONE_V_ONE"?"Choose exactly one person per side.":"Choose 1–5 people per side. A full 5-vs-5 requires the 10-seat battle stage."}</p>
    <div className="battleTeams">
     <article><h3>Side 1 ({left.length}/5)</h3>{stage.map(member=><label key={member.userId}><input type="checkbox" checked={left.includes(member.userId)} onChange={()=>toggle("left",member.userId)}/> {member.user.displayName}</label>)}</article>
     <article><h3>Side 2 ({right.length}/5)</h3>{stage.map(member=><label key={member.userId}><input type="checkbox" checked={right.includes(member.userId)} onChange={()=>toggle("right",member.userId)}/> {member.user.displayName}</label>)}</article>
    </div>
    <button type="button" onClick={start} disabled={!left.length||!right.length}>Start Battle</button>
   </>:!lastResult&&<p>No battle is active right now.</p>}
  </>}
  {message&&<p>{message}</p>}
 </section>;
}
