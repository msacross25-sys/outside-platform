import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const host=await db.hostApplication.findUnique({where:{userId:me.id},select:{status:true}});
 if(host?.status!=="APPROVED")return NextResponse.json({error:"Approved Host status is required to enter tournaments."},{status:403});

 const tournament=await db.battleTournament.findUnique({
  where:{id},
  include:{_count:{select:{entries:true}}}
 });
 if(!tournament)return NextResponse.json({error:"Tournament not found."},{status:404});
 if(tournament.status!=="REGISTRATION")return NextResponse.json({error:"Tournament registration is closed."},{status:409});
 if(tournament._count.entries>=tournament.bracketSize)return NextResponse.json({error:"Tournament is full."},{status:409});

 const entry=await db.battleTournamentEntry.upsert({
  where:{tournamentId_userId:{tournamentId:id,userId:me.id}},
  create:{tournamentId:id,userId:me.id},
  update:{eliminated:false,placement:null}
 });
 return NextResponse.json({entry},{status:201});
}

export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const tournament=await db.battleTournament.findUnique({where:{id}});
 if(!tournament)return NextResponse.json({error:"Tournament not found."},{status:404});
 if(tournament.status!=="REGISTRATION")return NextResponse.json({error:"Tournament registration is closed."},{status:409});
 if(tournament.ownerId===me.id)return NextResponse.json({error:"Tournament owner cannot leave their own tournament."},{status:409});

 await db.battleTournamentEntry.deleteMany({where:{tournamentId:id,userId:me.id}});
 return NextResponse.json({ok:true});
}
