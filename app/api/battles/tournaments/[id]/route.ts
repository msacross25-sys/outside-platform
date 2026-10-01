import {NextResponse} from "next/server";
import {db} from "@/lib/db";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const tournament=await db.battleTournament.findUnique({
  where:{id},
  include:{
   owner:{select:{username:true,displayName:true}},
   entries:{
    orderBy:[{eliminated:"asc"},{seed:"asc"}],
    include:{user:{select:{username:true,displayName:true,avatarUrl:true,battleProfile:{select:{rankTitle:true,wins:true,currentWinStreak:true}}}}}
   },
   battles:{
    orderBy:[{roundNumber:"asc"},{matchNumber:"asc"},{createdAt:"asc"}],
    include:{teams:true}
   }
  }
 });
 if(!tournament)return NextResponse.json({error:"Tournament not found."},{status:404});

 const active=tournament.entries.filter(entry=>!entry.eliminated);
 return NextResponse.json({
  tournament,
  activeEntrants:active.length,
  champion: tournament.status==="ENDED"&&active.length===1?active[0].user:null
 });
}
