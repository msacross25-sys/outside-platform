"use client";
import {useEffect,useState} from "react";
export function LiveStats({slug,status,startedAt}:{slug:string;status:string;startedAt:string|null}){
 const [seconds,setSeconds]=useState(0);
 useEffect(()=>{if(status!=="LIVE"||!startedAt)return;const tick=()=>setSeconds(Math.max(0,Math.floor((Date.now()-new Date(startedAt).getTime())/1000)));tick();const id=setInterval(tick,1000);return()=>clearInterval(id)},[status,startedAt]);
 const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;
 return <div className="featureCard"><span className="eyebrow">Live duration</span><b>{String(h).padStart(2,"0")}:{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}</b></div>
}