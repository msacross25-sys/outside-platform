import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {BATTLE_THEMES,MAX_BATTLE_TEAM_SIZE,validBattleDuration,validBattleMode} from "@/lib/battles";
import {finalizeBattle} from "@/lib/battleEngine";

export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const room=await db.porchRoom.findUnique({where:{slug},include:{members:true}});
 if(!room||room.status!=="LIVE"||!room.members.some(x=>x.userId===me.id&&x.role==="HOST")){
  return NextResponse.json({error:"Live Host access required."},{status:403});
 }

 const body=await request.json().catch(()=>null);
 const duration=Number(body?.durationMinutes);
 const theme=String(body?.theme??"");
 const mode=String(body?.mode??"TEAM_V_TEAM");
 const tournamentId=body?.tournamentId?String(body.tournamentId):null;
 const left=Array.isArray(body?.left)?body.left.map(String):[];
 const right=Array.isArray(body?.right)?body.right.map(String):[];

 if(!validBattleDuration(duration))return NextResponse.json({error:"Battle must be 5, 10, or 20 minutes."},{status:400});
 if(!validBattleMode(mode))return NextResponse.json({error:"Choose a valid battle mode."},{status:400});
 if(!BATTLE_THEMES.some(x=>x.key===theme))return NextResponse.json({error:"Choose a valid battle theme."},{status:400});
 if(!left.length||!right.length||left.length>MAX_BATTLE_TEAM_SIZE||right.length>MAX_BATTLE_TEAM_SIZE){
  return NextResponse.json({error:"Each side must have 1 to 5 participants."},{status:400});
 }
 if(mode==="ONE_V_ONE"&&(left.length!==1||right.length!==1)){
  return NextResponse.json({error:"1 vs 1 battles require exactly one participant on each side."},{status:400});
 }
 if(mode==="TEAM_V_TEAM"&&(left.length<1||right.length<1)){
  return NextResponse.json({error:"Team battles require at least one participant on each side."},{status:400});
 }
 if(mode==="TOURNAMENT"&&!tournamentId){
  return NextResponse.json({error:"Tournament matches require a tournament."},{status:400});
 }

 const allowed=new Set(room.members.filter(x=>["HOST","COHOST","SPEAKER"].includes(x.role)).map(x=>x.userId));
 if([...left,...right].some(id=>!allowed.has(id))||new Set([...left,...right]).size!==left.length+right.length){
  return NextResponse.json({error:"Battle participants must be unique people currently on stage."},{status:409});
 }

 if(tournamentId){
  const tournament=await db.battleTournament.findUnique({where:{id:tournamentId},include:{entries:true}});
  if(!tournament||!["REGISTRATION","LIVE"].includes(tournament.status)){
   return NextResponse.json({error:"Tournament is unavailable."},{status:409});
  }
  const entrants=new Set(tournament.entries.filter(entry=>!entry.eliminated).map(entry=>entry.userId));
  if([...left,...right].some(id=>!entrants.has(id))){
   return NextResponse.json({error:"Tournament battle participants must be active tournament entrants."},{status:409});
  }
 }

 const battle=await db.$transaction(async tx=>{
  const live=await tx.battle.findFirst({where:{roomId:room.id,status:"LIVE"},select:{id:true}});
  if(live)throw new Error("ACTIVE_BATTLE");

  return tx.battle.create({
   data:{
    roomId:room.id,
    tournamentId,
    mode,
    theme,
    durationMinutes:duration,
    status:"LIVE",
    startedAt:new Date(),
    roundNumber:Number.isFinite(Number(body?.roundNumber))?Number(body.roundNumber):null,
    matchNumber:Number.isFinite(Number(body?.matchNumber))?Number(body.matchNumber):null,
    teams:{create:[
     {side:1,memberIds:left},
     {side:2,memberIds:right}
    ]}
   },
   include:{teams:true}
  });
 },{isolationLevel:"Serializable"}).catch(error=>{
  if(error instanceof Error&&error.message==="ACTIVE_BATTLE")return null;
  throw error;
 });

 if(!battle)return NextResponse.json({error:"A battle is already active in this room."},{status:409});
 return NextResponse.json({battle},{status:201});
}

export async function PATCH(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const room=await db.porchRoom.findUnique({where:{slug},include:{members:true}});
 if(!room||!room.members.some(x=>x.userId===me.id&&x.role==="HOST")){
  return NextResponse.json({error:"Host access required."},{status:403});
 }

 const battle=await db.battle.findFirst({where:{roomId:room.id,status:"LIVE"},orderBy:{startedAt:"desc"}});
 if(!battle)return NextResponse.json({error:"No active battle."},{status:404});

 const ended=await finalizeBattle(battle.id,new Date());
 if(!ended)return NextResponse.json({error:"Battle could not be finalized."},{status:409});
 return NextResponse.json({battle:ended});
}

export async function GET(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const room=await db.porchRoom.findUnique({where:{slug},select:{id:true,status:true}});
 if(!room)return NextResponse.json({error:"Room not found."},{status:404});

 const battle=await db.battle.findFirst({
  where:{roomId:room.id,status:"LIVE"},
  orderBy:{startedAt:"desc"},
  include:{teams:true}
 });

 if(!battle){
  const recent=await db.battle.findFirst({
   where:{roomId:room.id,status:"ENDED"},
   orderBy:{endedAt:"desc"},
   include:{teams:true}
  });
  return NextResponse.json({battle:null,recent});
 }

 const deadline=(battle.startedAt?.getTime()??0)+battle.durationMinutes*60000;
 if(deadline&&Date.now()>=deadline){
  const ended=await finalizeBattle(battle.id,new Date(deadline));
  return NextResponse.json({battle:ended,expired:true});
 }

 return NextResponse.json({
  battle,
  endsAt:new Date(deadline).toISOString(),
  surgeStartsAt:new Date(deadline-battle.surgeSeconds*1000).toISOString()
 });
}
