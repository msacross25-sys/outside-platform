import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";

const DOUBLE_POINT_SECONDS=60;

async function consumeCard(tx:any,userId:string,currency:string){
 const inventory=await tx.battleRewardLedger.findFirst({
  where:{userId,currency,status:"AVAILABLE",amount:{gt:0}},
  orderBy:{createdAt:"asc"}
 });
 if(!inventory)throw new Error("NO_CARD");
 if(inventory.amount===1){
  await tx.battleRewardLedger.update({where:{id:inventory.id},data:{status:"CLAIMED"}});
 }else{
  await tx.battleRewardLedger.update({where:{id:inventory.id},data:{amount:{decrement:1}}});
 }
}

export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const body=await request.json().catch(()=>null);
 const card=String(body?.card??"");
 if(!["DOUBLE_POINT","SHIELD","REMATCH"].includes(card))return NextResponse.json({error:"Unsupported battle card."},{status:400});

 const room=await db.porchRoom.findUnique({where:{slug},select:{id:true,status:true}});
 if(!room||room.status!=="LIVE")return NextResponse.json({error:"Live room not found."},{status:404});

 if(card==="REMATCH"){
  const live=await db.battle.findFirst({where:{roomId:room.id,status:"LIVE"},select:{id:true}});
  if(live)return NextResponse.json({error:"Rematch Cards can only be used after the current battle ends."},{status:409});

  const recent=await db.battle.findFirst({
   where:{roomId:room.id,status:"ENDED"},
   orderBy:{endedAt:"desc"},
   include:{teams:true}
  });
  if(!recent)return NextResponse.json({error:"There is no completed battle to rematch."},{status:409});
  if(recent.mode==="TOURNAMENT")return NextResponse.json({error:"Tournament matches cannot be rematched with a card."},{status:409});
  if(!recent.teams.some(team=>team.memberIds.includes(me.id))){
   return NextResponse.json({error:"Only a participant from the last battle can request a rematch."},{status:403});
  }

  const existing=await db.battleRewardLedger.findFirst({
   where:{userId:me.id,battleId:recent.id,kind:"REMATCH_REQUEST",currency:"CARD_REMATCH",status:"AVAILABLE"}
  });
  if(existing)return NextResponse.json({card:"REMATCH",requested:true,battleId:recent.id,alreadyRequested:true});

  try{
   await db.$transaction(async tx=>{
    await consumeCard(tx,me.id,"CARD_REMATCH");
    await tx.battleRewardLedger.create({
     data:{
      userId:me.id,
      battleId:recent.id,
      kind:"REMATCH_REQUEST",
      currency:"CARD_REMATCH",
      amount:1,
      status:"AVAILABLE",
      metadataJson:JSON.stringify({requestedAt:new Date().toISOString()})
     }
    });
   },{isolationLevel:"Serializable"});
   return NextResponse.json({card:"REMATCH",requested:true,battleId:recent.id});
  }catch(error){
   if(error instanceof Error&&error.message==="NO_CARD")return NextResponse.json({error:"No Rematch Card is available."},{status:409});
   return NextResponse.json({error:"Rematch request could not be created."},{status:409});
  }
 }

 const battle=await db.battle.findFirst({
  where:{roomId:room.id,status:"LIVE"},
  orderBy:{startedAt:"desc"},
  include:{teams:true}
 });
 if(!battle)return NextResponse.json({error:"No active battle."},{status:409});

 const team=battle.teams.find(item=>item.memberIds.includes(me.id));
 if(!team)return NextResponse.json({error:"Only active battle participants can use battle cards."},{status:403});

 if(card==="DOUBLE_POINT"){
  const now=new Date();
  if(team.multiplierExpiresAt&&team.multiplierExpiresAt>now&&team.activeMultiplier>1){
   return NextResponse.json({error:"A Double-Point Card is already active for your side."},{status:409});
  }

  try{
   const result=await db.$transaction(async tx=>{
    await consumeCard(tx,me.id,"CARD_DOUBLE_POINT");
    const expiresAt=new Date(Date.now()+DOUBLE_POINT_SECONDS*1000);
    await tx.battleTeam.update({
     where:{id:team.id},
     data:{activeMultiplier:2,multiplierExpiresAt:expiresAt}
    });
    await tx.battleRewardLedger.create({
     data:{
      userId:me.id,
      battleId:battle.id,
      kind:"BATTLE_CARD_USED",
      currency:"CARD_DOUBLE_POINT",
      amount:1,
      status:"CLAIMED",
      metadataJson:JSON.stringify({card:"DOUBLE_POINT",side:team.side,expiresAt:expiresAt.toISOString()})
     }
    });
    return {side:team.side,expiresAt};
   },{isolationLevel:"Serializable"});
   return NextResponse.json({card:"DOUBLE_POINT",...result});
  }catch(error){
   if(error instanceof Error&&error.message==="NO_CARD")return NextResponse.json({error:"No Double-Point Card is available."},{status:409});
   return NextResponse.json({error:"Battle card could not be activated."},{status:409});
  }
 }

 const existingShield=await db.battleRewardLedger.findFirst({
  where:{userId:me.id,battleId:battle.id,kind:"BATTLE_CARD_USED",currency:"CARD_SHIELD"}
 });
 if(existingShield)return NextResponse.json({error:"A Shield Card is already active for this match."},{status:409});

 try{
  await db.$transaction(async tx=>{
   await consumeCard(tx,me.id,"CARD_SHIELD");
   await tx.battleRewardLedger.create({
    data:{
     userId:me.id,
     battleId:battle.id,
     kind:"BATTLE_CARD_USED",
     currency:"CARD_SHIELD",
     amount:1,
     status:"CLAIMED",
     metadataJson:JSON.stringify({card:"SHIELD",side:team.side})
    }
   });
  },{isolationLevel:"Serializable"});
  return NextResponse.json({card:"SHIELD",side:team.side,protected:true});
 }catch(error){
  if(error instanceof Error&&error.message==="NO_CARD")return NextResponse.json({error:"No Shield Card is available."},{status:409});
  return NextResponse.json({error:"Shield Card could not be activated."},{status:409});
 }
}
