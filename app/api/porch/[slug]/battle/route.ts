import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {BATTLE_THEMES,MAX_BATTLE_TEAM_SIZE,validBattleDuration,validBattleMode} from "@/lib/battles";
import {finalizeBattle} from "@/lib/battleEngine";
import {nextTournamentMatch} from "@/lib/tournamentBracket";

type ResultBattle={winnerSide:number|null;teams:{side:number;memberIds:string[]}[]};

async function winnerEffectsFor(battle:ResultBattle|null){
 if(!battle?.winnerSide)return [];
 const winnerIds=battle.teams.find(team=>team.side===battle.winnerSide)?.memberIds??[];
 if(!winnerIds.length)return [];
 return db.battleCosmeticSelection.findMany({
  where:{userId:{in:winnerIds},victoryKey:{not:null}},
  select:{userId:true,victoryKey:true}
 });
}

export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const room=await db.porchRoom.findUnique({where:{slug},include:{members:true}});
 if(!room||room.status!=="LIVE"||!room.members.some(x=>x.userId===me.id&&x.role==="HOST")){
  return NextResponse.json({error:"Live Host access required."},{status:403});
 }

 const body=await request.json().catch(()=>null);
 const rematchBattleId=body?.rematchBattleId?String(body.rematchBattleId):null;

 let duration=Number(body?.durationMinutes);
 let theme=String(body?.theme??"");
 let mode=String(body?.mode??"TEAM_V_TEAM");
 let tournamentId=body?.tournamentId?String(body.tournamentId):null;
 let left=Array.isArray(body?.left)?body.left.map(String):[];
 let right=Array.isArray(body?.right)?body.right.map(String):[];
 let roundNumber=Number.isFinite(Number(body?.roundNumber))?Number(body.roundNumber):null;
 let matchNumber=Number.isFinite(Number(body?.matchNumber))?Number(body.matchNumber):null;

 if(rematchBattleId){
  const previous=await db.battle.findUnique({where:{id:rematchBattleId},include:{teams:true}});
  if(!previous||previous.roomId!==room.id||previous.status!=="ENDED"){
   return NextResponse.json({error:"That completed battle is not available for a rematch."},{status:409});
  }
  if(previous.mode==="TOURNAMENT"){
   return NextResponse.json({error:"Tournament matches cannot be restarted as card rematches."},{status:409});
  }
  const requests=await db.battleRewardLedger.count({
   where:{battleId:previous.id,kind:"REMATCH_REQUEST",currency:"CARD_REMATCH",status:"AVAILABLE"}
  });
  if(requests<1)return NextResponse.json({error:"A participant must use a Rematch Card first."},{status:409});

  const side1=previous.teams.find(team=>team.side===1);
  const side2=previous.teams.find(team=>team.side===2);
  if(!side1||!side2)return NextResponse.json({error:"Previous battle teams are unavailable."},{status:409});

  duration=previous.durationMinutes;
  theme=previous.theme;
  mode=previous.mode;
  tournamentId=null;
  left=side1.memberIds;
  right=side2.memberIds;
  roundNumber=null;
  matchNumber=null;
 }

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
 if(mode==="TOURNAMENT"&&(left.length!==1||right.length!==1)){
  return NextResponse.json({error:"Tournament bracket matches are 1 vs 1."},{status:400});
 }

 const allowed=new Set(room.members.filter(x=>["HOST","COHOST","SPEAKER"].includes(x.role)).map(x=>x.userId));
 if([...left,...right].some(id=>!allowed.has(id))||new Set([...left,...right]).size!==left.length+right.length){
  return NextResponse.json({error:"Battle participants must be unique people currently on stage."},{status:409});
 }

 if(tournamentId){
  const tournament=await db.battleTournament.findUnique({where:{id:tournamentId},include:{entries:true}});
  if(!tournament||tournament.status!=="LIVE"){
   return NextResponse.json({error:"Tournament is unavailable."},{status:409});
  }
  if(tournament.ownerId!==me.id){
   return NextResponse.json({error:"Only the tournament owner can launch bracket matches."},{status:403});
  }
  if(mode!=="TOURNAMENT"){
   return NextResponse.json({error:"Tournament matches must use Tournament Mode."},{status:400});
  }

  const next=await nextTournamentMatch(tournamentId);
  if(!next)return NextResponse.json({error:"No tournament matchup is ready."},{status:409});
  left=[next.leftId];
  right=[next.rightId];
  roundNumber=next.roundNumber;
  matchNumber=next.matchNumber;
 }

 const battle=await db.$transaction(async tx=>{
  const live=await tx.battle.findFirst({where:{roomId:room.id,status:"LIVE"},select:{id:true}});
  if(live)throw new Error("ACTIVE_BATTLE");

  const created=await tx.battle.create({
   data:{
    roomId:room.id,
    tournamentId,
    mode,
    theme,
    durationMinutes:duration,
    status:"LIVE",
    startedAt:new Date(),
    roundNumber,
    matchNumber,
    teams:{create:[
     {side:1,memberIds:left},
     {side:2,memberIds:right}
    ]}
   },
   include:{teams:true}
  });

  if(rematchBattleId){
   await tx.battleRewardLedger.updateMany({
    where:{battleId:rematchBattleId,kind:"REMATCH_REQUEST",currency:"CARD_REMATCH",status:"AVAILABLE"},
    data:{status:"CLAIMED"}
   });
  }
  return created;
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
  const rematchRequests=recent&&recent.mode!=="TOURNAMENT"
   ?await db.battleRewardLedger.count({
     where:{battleId:recent.id,kind:"REMATCH_REQUEST",currency:"CARD_REMATCH",status:"AVAILABLE"}
    })
   :0;
  const winnerEffects=await winnerEffectsFor(recent);
  return NextResponse.json({battle:null,recent,rematchRequests,winnerEffects});
 }

 const deadline=(battle.startedAt?.getTime()??0)+battle.durationMinutes*60000;
 if(deadline&&Date.now()>=deadline){
  const ended=await finalizeBattle(battle.id,new Date(deadline));
  const winnerEffects=await winnerEffectsFor(ended);
  return NextResponse.json({battle:ended,expired:true,winnerEffects});
 }

 return NextResponse.json({
  battle,
  endsAt:new Date(deadline).toISOString(),
  surgeStartsAt:new Date(deadline-battle.surgeSeconds*1000).toISOString()
 });
}
