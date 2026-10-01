import Link from "next/link";
import {notFound} from "next/navigation";
import {Shell} from "@/components/Shell";
import {db} from "@/lib/db";

export default async function GuildDetail({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const guild=await db.battleGuild.findUnique({
  where:{slug},
  include:{
   owner:{select:{username:true,displayName:true}},
   members:{
    orderBy:{joinedAt:"asc"},
    include:{user:{select:{username:true,displayName:true,battleProfile:{select:{rankTitle:true,wins:true,rankingPoints:true}}}}}
   },
   territories:true,
   territoryScores:{
    orderBy:{points:"desc"},
    include:{territory:{select:{regionCode:true,seasonKey:true}}}
   }
  }
 });
 if(!guild)notFound();

 return <Shell><section className="page">
  <span className="eyebrow">BATTLE GUILD</span>
  <h1>{guild.name}</h1>
  <p className="lede">{guild.description??"Guild competing across OUTSiiDE territories."}</p>
  <p>Founder: <Link href={"/u/"+guild.owner.username}>@{guild.owner.username}</Link>{guild.regionCode?" · Home region "+guild.regionCode:""}</p>

  <div className="featureCard">
   <h2>Members</h2>
   {guild.members.map(member=><div key={member.userId}>
    <Link href={"/u/"+member.user.username}><b>{member.user.displayName}</b></Link>
    <span> · {member.role} · {member.user.battleProfile?.rankTitle??"BRONZE"} · {member.user.battleProfile?.wins??0} wins · {Number(member.user.battleProfile?.rankingPoints??0n).toLocaleString()} pts</span>
   </div>)}
  </div>

  <div className="featureCard">
   <h2>Territory Power</h2>
   {!guild.territoryScores.length&&<p>This guild has not scored territory points yet.</p>}
   {guild.territoryScores.map(score=><p key={score.territoryId+score.seasonKey}><b>{score.territory.regionCode}</b> · {Number(score.points).toLocaleString()} points · {score.territory.seasonKey}</p>)}
  </div>

  <div className="featureCard">
   <h2>Currently Held</h2>
   {!guild.territories.length&&<p>No territory is currently held.</p>}
   {guild.territories.map(territory=><p key={territory.id}>🌎 {territory.regionCode}{territory.heldSince?" · since "+territory.heldSince.toLocaleDateString():""}</p>)}
  </div>
 </section></Shell>;
}
