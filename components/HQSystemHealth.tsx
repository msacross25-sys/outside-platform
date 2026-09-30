"use client";
import {useEffect,useState} from "react";

type Check={ok:boolean;message?:string};
type Data={
 ready:boolean;
 release:string|null;
 checks:Record<string,Check>;
 time:string;
};

export function HQSystemHealth(){
 const [data,setData]=useState<Data|null>(null);
 const [error,setError]=useState("");

 async function load(){
  setError("");
  const response=await fetch("/api/hq/system/health",{cache:"no-store"});
  const body=await response.json().catch(()=>null);
  if(!response.ok){
   setError(body?.error??"Unable to load system health.");
   return;
  }
  setData(body);
 }

 useEffect(()=>{void load()},[]);

 if(error)return <section className="featureCard"><span className="eyebrow">System Health</span><p>{error}</p></section>;
 if(!data)return <section className="featureCard"><span className="eyebrow">System Health</span><p>Checking runtime readiness…</p></section>;

 return <section className="featureCard">
  <span className="eyebrow">System Health</span>
  <h2>{data.ready?"Ready for traffic":"Not ready for traffic"}</h2>
  <p>Release: {data.release??"not reported"} · checked {new Date(data.time).toLocaleString()}</p>
  <div className="hqSections">
   {Object.entries(data.checks).map(([name,check])=>
    <article key={name}>
     <b>{check.ok?"✓":"⚠"} {name}</b>
     <span>{check.ok?"Ready":check.message??"Needs attention"}</span>
    </article>
   )}
  </div>
  <button onClick={load}>Refresh health</button>
 </section>;
}
