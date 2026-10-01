"use client";

import {useEffect,useMemo,useState} from "react";
import {BATTLE_DURATIONS,BATTLE_THEMES,MAX_BATTLE_TEAM_SIZE} from "@/lib/battles";

type Member={userId:string;role:string;user:{username:string;displayName:string}};
type Team={id:string;side:number;memberIds:string[];score:number};
type Battle={id:string;theme:string;durationMinutes:number;status:string;startedAt:string|null;endedAt:string|null;teams:Team[]};
type BattleResponse={battle:Battle|null;endsAt?:string;expired?:boolean};

export function BattleCenter({slug,members,host,status}:{slug:string;members:Member[];host:boolean;status:string}){
 const stage=useMemo(()=>members.filter(member=>["HOST","COHOST","SPEAKER"].includes(member.role)),[members]);
 const [battle,setBattle]=useState<Battle|null>(null);
 const [lastResult,setLastResult]=useState<Battle|null>(null);
 const [endsAt,setEndsAt]=useState<string|null>(null);
 const [now,setNow]=useState(Date.now());
 const [theme,setTheme]=useState(BATTLE_THEMES[0].key);
 const [duration,setDuration]=useState<number>(5);
 const [left,setLeft]=useState<string[]>([]);
 const [right,setRight]=useState<string[]>([]);
 const [message,setMessage]=useState("");

 async function load(){
  const response=await fetch(`/api/porch/${slug}/battle`,{cache:"no-store"});
  if(!response.ok)return;
  const data:BattleResponse=await response.json();
  if(data.expired&&data.battle){
   setLastResult(data.battle);
   setBattle(null);
   setEndsAt(null);
   return;
  }
  if(data.battle?.status==="LIVE"){
   setBattle(data.battle);
   setEndsAt(data.endsAt??null);
  }else{
   setBattle(null);
   setEndsAt(null);
  }
 }

 useEffect(()=>{
  if(status!=="LIVE")return;
  void load();
  const refresh=window.setInterval(()=>void load(),5000);
  const clock=window.setInterval(()=>setNow(Date.now()),1000);
  return()=>{clearInterval(refresh);clearInterval(clock)};
 },[slug,status]);

 function toggle(side:"left"|"right",userId:string){
  const mine=side==="left"?left:right;
  const other=side==="left"?right:left;
  if(other.includes(userId)){setMessage("A participant can only be on one side.");return}
  const next=mine.includes(userId)?mine.filter(id=>id!==userId):[...mine,userId];
  if(next.length>MAX_BATTLE_TEAM_SIZE){setMessage("Each side can have up to 5 people.");return}
  setMessage("");
  side==="left"?setLeft(next):setRight(next);
 }

 async function start(){
  setMessage("");
  setLastResult(null);
  const response=await fetch(`/api/porch/${slug}/battle`,{
   method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({theme,durationMinutes:duration,left,right})
  });
  const data=await response.json();
  if(!response.ok){setMessage(data.error??"Unable to start battle.");return}
  setBattle(data.battle);
  setEndsAt(data.battle?.startedAt?new Date(new Date(data.battle.startedAt).getTime()+data.battle.durationMinutes*60000).toISOString():null);
  setMessage("Battle started.");
 }

 async function stop(){
  setMessage("");
  const response=await fetch(`/api/porch/${slug}/battle`,{method:"PATCH"});
  const data=await response.json();
  if(!response.ok){setMessage(data.error??"Unable to end battle.");return}
  if(data.battle)setLastResult(data.battle);
  setBattle(null);setEndsAt(null);setMessage("Battle ended.");
 }

 if(status!=="LIVE")return null;

 const activeTheme=BATTLE_THEMES.find(item=>item.key===battle?.theme);
 const resultTheme=BATTLE_THEMES.find(item=>item.key===lastResult?.theme);
 const secondsLeft=endsAt?Math.max(0,Math.ceil((new Date(endsAt).getTime()-now)/1000)):null;
 const timeLeft=secondsLeft===null?"":`${Math.floor(secondsLeft/60)}:${String(secondsLeft%60).padStart(2,"0")}`;
 const nameFor=(id:string)=>members.find(member=>member.userId===id)?.user.displayName??"Participant";
 const leftTeam=battle?.teams.find(team=>team.side===1);
 const rightTeam=battle?.teams.find(team=>team.side===2);
 const resultLeft=lastResult?.teams.find(team=>team.side===1);
 const resultRight=lastResult?.teams.find(team=>team.side===2);
 const winner=resultLeft&&resultRight
  ?resultLeft.score===resultRight.score?"Tie battle":resultLeft.score>resultRight.score?"Side 1 wins":"Side 2 wins"
  :"";

 return <section className="featureCard">
  <span className="eyebrow">OUTSiiDE BATTLE</span>
  {battle?.status==="LIVE"?<>
   <h2>{activeTheme?.icon??"⚡"} {activeTheme?.name??"Live Battle"}</h2>
   <p><b>{timeLeft||`${battle.durationMinutes}:00`}</b> remaining</p>
   <div className="battleTeams">
    <article><h3>Side 1</h3>{(leftTeam?.memberIds??[]).map(id=><p key={id}>{nameFor(id)}</p>)}<b>Score: {(leftTeam?.score??0).toLocaleString()}</b></article>
    <article><h3>Side 2</h3>{(rightTeam?.memberIds??[]).map(id=><p key={id}>{nameFor(id)}</p>)}<b>Score: {(rightTeam?.score??0).toLocaleString()}</b></article>
   </div>
   {host&&<button type="button" onClick={stop}>End Battle</button>}
  </>:<>
   {lastResult&&<div className="battleResult">
    <h2>{resultTheme?.icon??"🏁"} {winner}</h2>
    <p>Final score: <b>{(resultLeft?.score??0).toLocaleString()}</b> — <b>{(resultRight?.score??0).toLocaleString()}</b></p>
   </div>}
   {host?<><h2>Start a battle</h2>
    <p>Choose 1–5 people per side. A full 5-vs-5 requires the 10-seat battle stage.</p>
    <label>Theme <select value={theme} onChange={event=>setTheme(event.target.value)}>{BATTLE_THEMES.map(item=><option key={item.key} value={item.key}>{item.icon} {item.name}</option>)}</select></label>
    <label>Timer <select value={duration} onChange={event=>setDuration(Number(event.target.value))}>{BATTLE_DURATIONS.map(minutes=><option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></label>
    <div className="battleTeams">
     <article><h3>Side 1 ({left.length}/5)</h3>{stage.map(member=><label key={member.userId}><input type="checkbox" checked={left.includes(member.userId)} onChange={()=>toggle("left",member.userId)}/> {member.user.displayName}</label>)}</article>
     <article><h3>Side 2 ({right.length}/5)</h3>{stage.map(member=><label key={member.userId}><input type="checkbox" checked={right.includes(member.userId)} onChange={()=>toggle("right",member.userId)}/> {member.user.displayName}</label>)}</article>
    </div>
    <button type="button" onClick={start} disabled={!left.length||!right.length}>Start Battle</button></>:!lastResult&&<p>No battle is active right now.</p>}
  </>}
  {message&&<p>{message}</p>}
 </section>;
}
