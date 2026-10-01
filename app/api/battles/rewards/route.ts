import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {spinWinnerWheel} from "@/lib/battleRewards";
import {battlePassLevel} from "@/lib/battleRewardCatalog";

export async function GET(){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const [profile,pass,badges,spins,balances,recent]=await Promise.all([
  db.battleProfile.findUnique({where:{userId:me.id}}),
  db.battlePassProgress.findUnique({where:{userId:me.id}}),
  db.userBadge.findMany({where:{userId:me.id,key:{startsWith:"BATTLE"}},orderBy:{unlockedAt:"desc"},take:30}),
  db.battleRewardLedger.count({where:{userId:me.id,kind:"WINNER_WHEEL_SPIN",status:"AVAILABLE"}}),
  db.battleRewardLedger.groupBy({
   by:["currency"],
   where:{userId:me.id,status:"AVAILABLE",currency:{in:["BATTLE_TOKEN","GEM","CARD_DOUBLE_POINT"]}},
   _sum:{amount:true}
  }),
  db.battleRewardLedger.findMany({where:{userId:me.id},orderBy:{createdAt:"desc"},take:20})
 ]);

 const xp=pass?.freeXp??0;
 const level=battlePassLevel(xp);
 if(pass&&pass.level!==level){
  await db.battlePassProgress.update({where:{userId:me.id},data:{level}});
 }

 return NextResponse.json({
  profile:profile?{...profile,rankingPoints:profile.rankingPoints.toString(),lifetimeBattlePoints:profile.lifetimeBattlePoints.toString(),lifetimeGiftValueCents:profile.lifetimeGiftValueCents.toString()}:null,
  battlePass:pass?{...pass,level}:null,
  badges,
  wheelSpins:spins,
  balances:Object.fromEntries(balances.map(row=>[row.currency,row._sum.amount??0])),
  recent
 });
}

export async function POST(){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const reward=spinWinnerWheel();

 try{
  const result=await db.$transaction(async tx=>{
   const spin=await tx.battleRewardLedger.findFirst({
    where:{userId:me.id,kind:"WINNER_WHEEL_SPIN",status:"AVAILABLE"},
    orderBy:{createdAt:"asc"}
   });
   if(!spin)throw new Error("NO_SPIN");

   await tx.battleRewardLedger.update({
    where:{id:spin.id},
    data:{status:"CLAIMED"}
   });

   if(reward.currency==="BONUS_COIN"){
    await tx.coinWallet.upsert({
     where:{userId:me.id},
     create:{userId:me.id,balanceCoins:BigInt(reward.amount)},
     update:{balanceCoins:{increment:BigInt(reward.amount)}}
    });
   }else if(reward.currency==="BATTLE_PASS_XP"){
    const season=new Date();
    const seasonKey=season.getUTCFullYear()+"-Q"+(Math.floor(season.getUTCMonth()/3)+1);
    await tx.battlePassProgress.upsert({
     where:{userId:me.id},
     create:{userId:me.id,seasonKey,freeXp:reward.amount,level:battlePassLevel(reward.amount)},
     update:{freeXp:{increment:reward.amount}}
    });
   }else if(reward.currency==="COSMETIC_VICTORY_FRAME"){
    await tx.hostCosmetic.upsert({
     where:{userId_effectKey:{userId:me.id,effectKey:"victory-frame"}},
     create:{userId:me.id,effectKey:"victory-frame",source:"WINNER_WHEEL"},
     update:{source:"WINNER_WHEEL"}
    });
   }else{
    await tx.battleRewardLedger.create({
     data:{
      userId:me.id,
      battleId:spin.battleId,
      kind:"WINNER_WHEEL_REWARD",
      currency:reward.currency,
      amount:reward.amount,
      status:"AVAILABLE",
      metadataJson:JSON.stringify({rewardKey:reward.key,label:reward.label})
     }
    });
   }

   const ledger=await tx.battleRewardLedger.create({
    data:{
     userId:me.id,
     battleId:spin.battleId,
     kind:"WINNER_WHEEL_RESULT",
     currency:reward.currency,
     amount:reward.amount,
     status:"CLAIMED",
     metadataJson:JSON.stringify({rewardKey:reward.key,label:reward.label})
    }
   });

   return ledger;
  },{isolationLevel:"Serializable"});

  return NextResponse.json({reward:{key:reward.key,label:reward.label,currency:reward.currency,amount:reward.amount},ledgerId:result.id});
 }catch(error){
  if(error instanceof Error&&error.message==="NO_SPIN")return NextResponse.json({error:"No Winner's Wheel spins are available."},{status:409});
  return NextResponse.json({error:"Winner's Wheel is unavailable right now."},{status:409});
 }
}
