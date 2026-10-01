import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const tournament=await db.battleTournament.findUnique({
  where:{id},
  include:{entries:{orderBy:{createdAt:"asc"}}}
 });
 if(!tournament)return NextResponse.json({error:"Tournament not found."},{status:404});
 if(tournament.ownerId!==me.id)return NextResponse.json({error:"Only the tournament owner can start it."},{status:403});
 if(tournament.status!=="REGISTRATION")return NextResponse.json({error:"Tournament has already started or ended."},{status:409});
 if(tournament.entries.length<2)return NextResponse.json({error:"At least 2 entrants are required."},{status:409});

 await db.$transaction(async tx=>{
  for(let i=0;i<tournament.entries.length;i++){
   await tx.battleTournamentEntry.update({
    where:{id:tournament.entries[i].id},
    data:{seed:i+1,eliminated:false,placement:null}
   });
  }
  await tx.battleTournament.update({
   where:{id},
   data:{status:"LIVE",currentRound:1,startsAt:tournament.startsAt??new Date()}
  });
 });

 return NextResponse.json({ok:true,entrants:tournament.entries.length});
}
