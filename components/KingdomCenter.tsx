"use client";
import {FormEvent,useEffect,useState} from "react";
import Link from "next/link";

export function KingdomCenter(){
 const [data,setData]=useState<any>(null);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);

 async function load(){
  const response=await fetch("/api/battles/kingdoms",{cache:"no-store"});
  if(response.ok)setData(await response.json());
 }

 useEffect(()=>{void load()},[]);

 async function createGuild(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMessage("");
  const form=new FormData(e.currentTarget);
  const response=await fetch("/api/battles/guilds",{
   method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({
    name:form.get("name"),
    description:form.get("description"),
    regionCode:form.get("regionCode")
   })
  });
  const result=await response.json();
  setMessage(response.ok?"Guild created.":result.error??"Unable to create guild.");
  if(response.ok){e.currentTarget.reset();await load()}
  setBusy(false);
 }

 async function join(slug:string){
  setMessage("");
  const response=await fetch("/api/battles/guilds/"+encodeURIComponent(slug)+"/join",{method:"POST"});
  const result=await response.json();
  setMessage(response.ok?"Guild joined.":result.error??"Unable to join guild.");
  if(response.ok)await load();
 }

 if(!data)return <section className="featureCard"><p>Loading Kingdoms…</p></section>;

 return <div>
  {data.myGuild?<section className="featureCard">
   <span className="eyebrow">YOUR GUILD</span>
   <h2>{data.myGuild.name}</h2>
   <p>{data.myGuild.regionCode??"No home region selected"}</p>
   <Link href={"/battles/kingdoms/"+data.myGuild.slug}>Open Guild</Link>
  </section>:<section className="featureCard">
   <span className="eyebrow">CREATE A GUILD</span>
   <h2>Build your Kingdom crew.</h2>
   <form onSubmit={createGuild}>
    <label>Guild name<input name="name" minLength={3} maxLength={60} required/></label>
    <label>Description<input name="description" maxLength={240}/></label>
    <label>Home region<input name="regionCode" placeholder="US-VA" maxLength={12}/></label>
    <button disabled={busy}>{busy?"Creating…":"Create Guild"}</button>
   </form>
  </section>}

  <section className="featureCard">
   <span className="eyebrow">GUILDS</span>
   <h2>Find your crew.</h2>
   {data.guilds.map((guild:any)=><article key={guild.id} className="searchResult">
    <Link href={"/battles/kingdoms/"+guild.slug}><b>{guild.name}</b></Link>
    <span>{guild.regionCode??"Open region"} · {guild._count.members} members · {guild._count.territories} territories</span>
    <p>Founded by @{guild.owner.username}</p>
    {!data.myGuild&&<button type="button" onClick={()=>join(guild.slug)}>Join Guild</button>}
   </article>)}
  </section>

  <section className="featureCard">
   <span className="eyebrow">TERRITORIES · {data.season}</span>
   <h2>Regions are earned in battle.</h2>
   {!data.territories.length&&<p>No territory has been claimed this season yet.</p>}
   {data.territories.map((territory:any)=><article key={territory.id} className="searchResult">
    <b>🌎 {territory.regionCode}</b>
    <p>Holder: {territory.holderGuild?<Link href={"/battles/kingdoms/"+territory.holderGuild.slug}>{territory.holderGuild.name}</Link>:"Unclaimed"}</p>
    {territory.leaders.map((leader:any,index:number)=><span key={leader.guildId}>#{index+1} {leader.guild.name} · {Number(leader.points).toLocaleString()} pts<br/></span>)}
   </article>)}
  </section>
  {message&&<p>{message}</p>}
 </div>;
}
