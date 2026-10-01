import {db} from "@/lib/db";

function matchKey(a:string,b:string){
 return [a,b].sort().join(":");
}

export async function nextTournamentMatch(tournamentId:string){
 const tournament=await db.battleTournament.findUnique({
  where:{id:tournamentId},
  include:{
   entries:{where:{eliminated:false},orderBy:{seed:"asc"}},
   battles:{
    where:{status:{in:["LIVE","ENDED"]}},
    orderBy:{createdAt:"asc"},
    include:{teams:true}
   }
  }
 });
 if(!tournament||tournament.status!=="LIVE")return null;

 const active=tournament.entries.filter(entry=>!entry.eliminated);
 if(active.length<2)return null;

 const pairs:Array<{leftId:string;rightId:string;matchNumber:number}>=[];
 for(let i=0;i<Math.floor(active.length/2);i++){
  pairs.push({
   leftId:active[i].userId,
   rightId:active[active.length-1-i].userId,
   matchNumber:i+1
  });
 }

 const played=new Set(
  tournament.battles
   .filter(battle=>battle.roundNumber===tournament.currentRound)
   .flatMap(battle=>{
    const side1=battle.teams.find(team=>team.side===1)?.memberIds[0];
    const side2=battle.teams.find(team=>team.side===2)?.memberIds[0];
    return side1&&side2?[matchKey(side1,side2)]:[];
   })
 );

 const next=pairs.find(pair=>!played.has(matchKey(pair.leftId,pair.rightId)));
 if(!next)return null;
 return {
  tournamentId:tournament.id,
  tournamentName:tournament.name,
  roundNumber:tournament.currentRound,
  matchNumber:next.matchNumber,
  leftId:next.leftId,
  rightId:next.rightId
 };
}
