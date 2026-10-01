import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";

const BRACKET_SIZES=[4,8,16,32];

export async function GET(request:Request){
 const me=await currentUser();
 const url=new URL(request.url);
 const mine=url.searchParams.get("mine")==="1";
 const requestedStatus=url.searchParams.get("status")?.trim().toUpperCase()||null;

 const tournaments=await db.battleTournament.findMany({
  where:{
   ...(mine&&me?{ownerId:me.id}:{}),
   ...(requestedStatus?{status:requestedStatus}:{status:{in:["REGISTRATION","LIVE"]}})
  },
  orderBy:[{startsAt:"asc"},{createdAt:"desc"}],
  take:50,
  include:{
   owner:{select:{username:true,displayName:true}},
   entries:{orderBy:[{seed:"asc"},{createdAt:"asc"}]},
   _count:{select:{entries:true,battles:true}}
  }
 });

 return NextResponse.json({tournaments});
}

export async function POST(request:Request){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const host=await db.hostApplication.findUnique({where:{userId:me.id},select:{status:true}});
 if(host?.status!=="APPROVED")return NextResponse.json({error:"Approved Host status is required to create a tournament."},{status:403});

 const body=await request.json().catch(()=>null);
 const name=String(body?.name??"").trim().slice(0,100);
 const bracketSize=Number(body?.bracketSize);
 let startsAt:Date|null=null;

 if(name.length<3)return NextResponse.json({error:"Tournament name must be at least 3 characters."},{status:400});
 if(!BRACKET_SIZES.includes(bracketSize))return NextResponse.json({error:"Bracket size must be 4, 8, 16, or 32."},{status:400});

 if(body?.startsAt){
  startsAt=new Date(body.startsAt);
  if(!Number.isFinite(startsAt.getTime()))return NextResponse.json({error:"Enter a valid tournament start date."},{status:400});
 }

 const tournament=await db.battleTournament.create({
  data:{
   ownerId:me.id,
   name,
   bracketSize,
   prizePoolCents:0,
   startsAt,
   entries:{create:{userId:me.id,seed:1}}
  },
  include:{entries:true}
 });

 return NextResponse.json({tournament},{status:201});
}
