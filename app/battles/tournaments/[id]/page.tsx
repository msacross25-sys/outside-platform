import Link from "next/link";
import {notFound} from "next/navigation";
import {Shell} from "@/components/Shell";
import {db} from "@/lib/db";

export default async function TournamentDetail({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const tournament=await db.battleTournament.findUnique({
  where:{id},
  include:{
   owner:{select:{username:true,displayName:true}},
   entries:{
    orderBy:[{eliminated:"asc"},{seed:"asc"}],
    include:{user:{select:{username:true,displayName:true,battleProfile:{select:{rankTitle:true,wins:true,currentWinStreak:true}}}}}
   },
   battles:{
    orderBy:[{roundNumber:"asc"},{matchNumber:"asc"},{createdAt:"asc"}],
    include:{teams:true}
   }
  }
 });
 if(!tournament)notFound();

 const active=tournament.entries.filter(entry=>!entry.eliminated);
 const champion=tournament.status==="ENDED"&&active.length===1?active[0]:null;
 const nameFor=(userId:string)=>tournament.entries.find(entry=>entry.userId===userId)?.user.displayName??"Competitor";

 return <Shell><section className="page">
  <span className="eyebrow">TOURNAMENT BRACKET</span>
  <h1>{tournament.name}</h1>
  <p className="lede">{tournament.status} · Hosted by <Link href={"/u/"+tournament.owner.username}>@{tournament.owner.username}</Link> · Round {tournament.currentRound}</p>
  {tournament.prizePoolCents>0&&<p><b>Prize pool:</b> {"$"}{(tournament.prizePoolCents/100).toFixed(2)}</p>}
  {champion&&<article className="featureCard"><h2>👑 Champion: {champion.user.displayName}</h2><p>@{champion.user.username} · {champion.user.battleProfile?.rankTitle??"BRONZE"}</p></article>}

  <div className="featureCard">
   <h2>Entrants</h2>
   {tournament.entries.map(entry=><div key={entry.id}>
    <b>#{entry.seed??"—"} {entry.user.displayName}</b>
    <span> @{entry.user.username} · {entry.user.battleProfile?.rankTitle??"BRONZE"} · {entry.eliminated?"Eliminated":"Active"}</span>
   </div>)}
  </div>

  <div className="featureCard">
   <h2>Matches</h2>
   {!tournament.battles.length&&<p>No matches have been completed yet. The Host launches tournament matches from a Live Battle Center.</p>}
   {tournament.battles.map(match=>{
    const side1=match.teams.find(team=>team.side===1);
    const side2=match.teams.find(team=>team.side===2);
    return <article key={match.id} className="searchResult">
     <b>Round {match.roundNumber??"—"} · Match {match.matchNumber??"—"}</b>
     <p>{(side1?.memberIds??[]).map(nameFor).join(", ")} <b>{side1?.score??0}</b> — <b>{side2?.score??0}</b> {(side2?.memberIds??[]).map(nameFor).join(", ")}</p>
     <span>{match.status}{match.winnerSide?" · Side "+match.winnerSide+" advanced":""}</span>
    </article>;
   })}
  </div>
 </section></Shell>;
}
