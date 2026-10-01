import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {nextTournamentMatch} from "@/lib/tournamentBracket";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const tournament=await db.battleTournament.findUnique({
  where:{id},
  select:{ownerId:true,status:true,name:true}
 });
 if(!tournament)return NextResponse.json({error:"Tournament not found."},{status:404});
 if(tournament.ownerId!==me.id)return NextResponse.json({error:"Only the tournament owner can manage bracket matches."},{status:403});
 if(tournament.status!=="LIVE")return NextResponse.json({error:"Tournament is not live."},{status:409});

 const next=await nextTournamentMatch(id);
 if(!next)return NextResponse.json({match:null,complete:true});

 const users=await db.user.findMany({
  where:{id:{in:[next.leftId,next.rightId]}},
  select:{id:true,username:true,displayName:true}
 });
 const userMap=new Map(users.map(user=>[user.id,user]));

 return NextResponse.json({
  match:{
   ...next,
   left:userMap.get(next.leftId)??null,
   right:userMap.get(next.rightId)??null
  }
 });
}
