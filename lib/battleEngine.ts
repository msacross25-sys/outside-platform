import {db} from "@/lib/db";
import {
 BATTLE_WINNER_FEATURE_HOURS,
 BATTLE_REWARD_POOL_WINNER_PERCENT,
 BATTLE_REWARD_POOL_WEEKLY_PERCENT,
 STREAK_5_BONUS_COINS,
 STREAK_25_VIP_DAYS,
 WIN_STREAK_REWARDS,
 battleRankFor,
 winnerRankingPoints
} from "@/lib/battles";

function seasonKey(date=new Date()){
 const quarter=Math.floor(date.getUTCMonth()/3)+1;
 return date.getUTCFullYear()+"-Q"+quarter;
}

function splitAmount(total:number,ids:string[]){
 if(!ids.length)return new Map<string,number>();
 const base=Math.floor(total/ids.length);
 let remainder=total-base*ids.length;
 const result=new Map<string,number>();
 for(const id of ids){
  result.set(id,base+(remainder>0?1:0));
  if(remainder>0)remainder--;
 }
 return result;
}

export async function finalizeBattle(battleId:string,endedAt=new Date()){
 return db.$transaction(async tx=>{
  const battle=await tx.battle.findUnique({
   where:{id:battleId},
   include:{teams:true}
  });
  if(!battle)return null;
  if(battle.finalizedAt)return battle;

  const side1=battle.teams.find(team=>team.side===1);
  const side2=battle.teams.find(team=>team.side===2);
  if(!side1||!side2)return null;

  const tied=side1.score===side2.score;
  const winnerSide=tied?null:(side1.score>side2.score?1:2);
  const featuredUntil=winnerSide
   ?new Date(endedAt.getTime()+BATTLE_WINNER_FEATURE_HOURS*60*60*1000)
   :null;

  const allIds=[...new Set([...side1.memberIds,...side2.memberIds])];
  const users=await tx.user.findMany({
   where:{id:{in:allIds}},
   select:{id:true,regionCode:true}
  });
  const regions=new Map(users.map(user=>[user.id,user.regionCode]));
  const shieldRows=await tx.battleRewardLedger.findMany({
   where:{battleId:battle.id,kind:"BATTLE_CARD_USED",currency:"CARD_SHIELD"},
   select:{userId:true}
  });
  const shieldedUsers=new Set(shieldRows.map(row=>row.userId).filter((id):id is string=>!!id));

  for(const team of [side1,side2]){
   const memberCount=Math.max(1,team.memberIds.length);
   const pointsPerMember=Math.floor(team.score/memberCount);
   const giftValuePerMember=Math.floor(team.giftValueCents/memberCount);
   const won=winnerSide===team.side;

   for(const userId of team.memberIds){
    const rankingPoints=winnerRankingPoints(pointsPerMember,won);

    await tx.battleParticipantResult.upsert({
     where:{battleId_userId:{battleId:battle.id,userId}},
     create:{
      battleId:battle.id,
      userId,
      side:team.side,
      won,
      tied,
      battlePoints:pointsPerMember,
      rankingPoints,
      regionCode:regions.get(userId)??null
     },
     update:{
      side:team.side,
      won,
      tied,
      battlePoints:pointsPerMember,
      rankingPoints,
      regionCode:regions.get(userId)??null
     }
    });

    const existing=await tx.battleProfile.findUnique({where:{userId}});
    const protectedLoss=!won&&!tied&&shieldedUsers.has(userId);
    const currentStreak=tied?0:won?(existing?.currentWinStreak??0)+1:protectedLoss?(existing?.currentWinStreak??0):0;
    const bestStreak=Math.max(existing?.bestWinStreak??0,currentStreak);
    const totalRanking=Number(existing?.rankingPoints??0n)+rankingPoints;
    const projectedWins=(existing?.wins??0)+(won?1:0);
    const projectedLifetimePoints=Number(existing?.lifetimeBattlePoints??0n)+pointsPerMember;
    const rank=battleRankFor(totalRanking);

    await tx.battleProfile.upsert({
     where:{userId},
     create:{
      userId,
      wins:won?1:0,
      losses:!won&&!tied?1:0,
      ties:tied?1:0,
      currentWinStreak:currentStreak,
      bestWinStreak:bestStreak,
      rankingPoints:BigInt(rankingPoints),
      lifetimeBattlePoints:BigInt(pointsPerMember),
      lifetimeGiftValueCents:BigInt(giftValuePerMember),
      rankTitle:rank.key,
      featuredUntil:won?featuredUntil:null,
      recommendedUntil:won?featuredUntil:null,
      hallOfFame:currentStreak>=100
     },
     update:{
      wins:{increment:won?1:0},
      losses:{increment:!won&&!tied?1:0},
      ties:{increment:tied?1:0},
      currentWinStreak:currentStreak,
      bestWinStreak:bestStreak,
      rankingPoints:{increment:BigInt(rankingPoints)},
      lifetimeBattlePoints:{increment:BigInt(pointsPerMember)},
      lifetimeGiftValueCents:{increment:BigInt(giftValuePerMember)},
      rankTitle:rank.key,
      featuredUntil:won?featuredUntil:existing?.featuredUntil,
      recommendedUntil:won?featuredUntil:existing?.recommendedUntil,
      hallOfFame:(existing?.hallOfFame??false)||currentStreak>=100
     }
    });

    const xp=Math.max(10,Math.floor(rankingPoints/100));
    await tx.battlePassProgress.upsert({
     where:{userId},
     create:{userId,seasonKey:seasonKey(endedAt),freeXp:xp,level:1},
     update:{seasonKey:seasonKey(endedAt),freeXp:{increment:xp}}
    });

    await tx.userBadge.upsert({
     where:{userId_key:{userId,key:"BATTLE_RANK_"+rank.key}},
     create:{userId,key:"BATTLE_RANK_"+rank.key,name:rank.name+" Battle Rank",icon:"🎖️",featured:rank.key==="IMMORTAL"},
     update:{name:rank.name+" Battle Rank",icon:"🎖️"}
    });

    if(projectedWins>=1){
     await tx.userBadge.upsert({
      where:{userId_key:{userId,key:"FIRST_BATTLE_WIN"}},
      create:{userId,key:"FIRST_BATTLE_WIN",name:"First Win",icon:"🏆",featured:false},
      update:{}
     });
    }
    if(projectedLifetimePoints>=1_000_000){
     await tx.userBadge.upsert({
      where:{userId_key:{userId,key:"BATTLE_POINTS_1M"}},
      create:{userId,key:"BATTLE_POINTS_1M",name:"1 Million Battle Points",icon:"🎯",featured:true},
      update:{featured:true}
     });
    }
    if(projectedWins>=25){
     await tx.userBadge.upsert({
      where:{userId_key:{userId,key:"BATTLE_KING_TITLE_UNLOCK"}},
      create:{userId,key:"BATTLE_KING_TITLE_UNLOCK",name:"Battle King Title Unlocked",icon:"👑",featured:false},
      update:{}
     });
     await tx.userBadge.upsert({
      where:{userId_key:{userId,key:"QUEEN_OF_BATTLES_TITLE_UNLOCK"}},
      create:{userId,key:"QUEEN_OF_BATTLES_TITLE_UNLOCK",name:"Queen of Battles Title Unlocked",icon:"👑",featured:false},
      update:{}
     });
    }
    if(projectedWins>=100){
     await tx.userBadge.upsert({
      where:{userId_key:{userId,key:"GRAND_CHAMPION"}},
      create:{userId,key:"GRAND_CHAMPION",name:"Grand Champion",icon:"🏆",featured:true},
      update:{featured:true}
     });
    }
    if((existing?.losses??0)===0&&projectedWins>=10){
     await tx.userBadge.upsert({
      where:{userId_key:{userId,key:"UNDEFEATED_CHAMPION"}},
      create:{userId,key:"UNDEFEATED_CHAMPION",name:"Undefeated Champion",icon:"⚔️",featured:true},
      update:{featured:true}
     });
    }

    const guildMembership=await tx.battleGuildMember.findUnique({
     where:{userId},
     include:{guild:{select:{id:true,regionCode:true}}}
    });
    const territoryRegion=regions.get(userId)??guildMembership?.guild.regionCode??null;
    if(guildMembership&&territoryRegion){
     const season=seasonKey(endedAt);
     const existingTerritory=await tx.battleTerritory.findUnique({where:{regionCode:territoryRegion}});
     const territory=!existingTerritory
      ?await tx.battleTerritory.create({data:{regionCode:territoryRegion,seasonKey:season}})
      :existingTerritory.seasonKey===season
       ?existingTerritory
       :await tx.battleTerritory.update({
         where:{id:existingTerritory.id},
         data:{seasonKey:season,holderGuildId:null,heldSince:null}
        });

     await tx.battleTerritoryScore.upsert({
      where:{guildId_territoryId_seasonKey:{
       guildId:guildMembership.guildId,
       territoryId:territory.id,
       seasonKey:season
      }},
      create:{
       guildId:guildMembership.guildId,
       territoryId:territory.id,
       seasonKey:season,
       points:BigInt(rankingPoints)
      },
      update:{points:{increment:BigInt(rankingPoints)}}
     });

     const leader=await tx.battleTerritoryScore.findFirst({
      where:{territoryId:territory.id,seasonKey:season},
      orderBy:{points:"desc"}
     });
     if(leader&&leader.guildId!==territory.holderGuildId){
      await tx.battleTerritory.update({
       where:{id:territory.id},
       data:{holderGuildId:leader.guildId,heldSince:new Date()}
      });
     }
    }

    if(won){
     const previousStreak=existing?.currentWinStreak??0;

     if(previousStreak<5&&currentStreak>=5){
      await tx.coinWallet.upsert({
       where:{userId},
       create:{userId,balanceCoins:BigInt(STREAK_5_BONUS_COINS)},
       update:{balanceCoins:{increment:BigInt(STREAK_5_BONUS_COINS)}}
      });
      await tx.battleRewardLedger.create({
       data:{userId,battleId:battle.id,kind:"STREAK_5_REWARD",currency:"BONUS_COIN",amount:STREAK_5_BONUS_COINS,status:"CLAIMED"}
      });
     }

     if(previousStreak<10&&currentStreak>=10){
      await tx.hostCosmetic.upsert({
       where:{userId_effectKey:{userId,effectKey:"streak-10-profile-frame"}},
       create:{userId,effectKey:"streak-10-profile-frame",source:"WIN_STREAK_10"},
       update:{source:"WIN_STREAK_10"}
      });
     }

     if(previousStreak<25&&currentStreak>=25){
      await tx.battleRewardLedger.create({
       data:{userId,battleId:battle.id,kind:"STREAK_25_VIP",currency:"VIP_DAY",amount:STREAK_25_VIP_DAYS,status:"AVAILABLE"}
      });
     }

     if(previousStreak<50&&currentStreak>=50){
      await tx.userBadge.upsert({
       where:{userId_key:{userId,key:"LEGENDARY_BATTLE_CHAMPION"}},
       create:{userId,key:"LEGENDARY_BATTLE_CHAMPION",name:"Legendary Battle Champion",icon:"🔥",featured:true},
       update:{featured:true}
      });
     }

     if(previousStreak<100&&currentStreak>=100){
      await tx.userBadge.upsert({
       where:{userId_key:{userId,key:"BATTLE_HALL_OF_FAME"}},
       create:{userId,key:"BATTLE_HALL_OF_FAME",name:"Battle Hall of Fame",icon:"🏛️",featured:true},
       update:{featured:true}
      });
     }

     await tx.userBadge.upsert({
      where:{userId_key:{userId,key:"BATTLE_WINNER"}},
      create:{userId,key:"BATTLE_WINNER",name:"Battle Winner",icon:"🏆",featured:true},
      update:{featured:true}
     });
     for(const reward of WIN_STREAK_REWARDS){
      if(currentStreak>=reward.wins){
       await tx.userBadge.upsert({
        where:{userId_key:{userId,key:reward.key}},
        create:{userId,key:reward.key,name:reward.name,icon:reward.wins>=100?"🏛️":"🔥",featured:reward.wins>=50},
        update:{featured:reward.wins>=50}
       });
      }
     }
    }
   }
  }

  if(winnerSide&&battle.rewardPoolCents>0){
   const winners=(winnerSide===1?side1:side2).memberIds;
   const winnerPool=Math.floor(battle.rewardPoolCents*BATTLE_REWARD_POOL_WINNER_PERCENT/100);
   const weeklyPool=Math.floor(battle.rewardPoolCents*BATTLE_REWARD_POOL_WEEKLY_PERCENT/100);
   const seasonPool=battle.rewardPoolCents-winnerPool-weeklyPool;
   const payouts=splitAmount(winnerPool,winners);

   for(const [userId,amountCents] of payouts){
    if(amountCents<=0)continue;
    await tx.battleEarning.create({
     data:{
      battleId:battle.id,
      userId,
      kind:"WINNER_REWARD_POOL",
      amountCents,
      status:"PENDING"
     }
    });
    await tx.battleRewardLedger.create({
     data:{
      battleId:battle.id,
      userId,
      kind:"WINNER_CASH_BONUS",
      currency:"CASH_CENTS",
      amount:amountCents,
      status:"RESERVED"
     }
    });
    await tx.battleRewardLedger.create({
     data:{
      battleId:battle.id,
      userId,
      kind:"WINNER_WHEEL_SPIN",
      currency:"SPIN",
      amount:1,
      status:"AVAILABLE"
     }
    });
   }

   if(weeklyPool>0){
    await tx.battleRewardLedger.create({
     data:{
      battleId:battle.id,
      kind:"WEEKLY_JACKPOT_RESERVE",
      currency:"CASH_CENTS",
      amount:weeklyPool,
      status:"RESERVED"
     }
    });
   }
   if(seasonPool>0){
    await tx.battleRewardLedger.create({
     data:{
      battleId:battle.id,
      kind:"SEASON_CHAMPIONSHIP_RESERVE",
      currency:"CASH_CENTS",
      amount:seasonPool,
      status:"RESERVED"
     }
    });
   }
  }

  if(battle.tournamentId&&winnerSide){
   const winnerIds=(winnerSide===1?side1:side2).memberIds;
   const loserIds=(winnerSide===1?side2:side1).memberIds;
   await tx.battleTournamentEntry.updateMany({
    where:{tournamentId:battle.tournamentId,userId:{in:loserIds}},
    data:{eliminated:true}
   });
   await tx.battleTournamentEntry.updateMany({
    where:{tournamentId:battle.tournamentId,userId:{in:winnerIds}},
    data:{eliminated:false}
   });

   const remaining=await tx.battleTournamentEntry.findMany({
    where:{tournamentId:battle.tournamentId,eliminated:false},
    select:{id:true,userId:true}
   });

   if(remaining.length===1){
    await tx.battleTournamentEntry.update({
     where:{id:remaining[0].id},
     data:{placement:1}
    });
    await tx.battleTournament.update({
     where:{id:battle.tournamentId},
     data:{status:"ENDED",endsAt:endedAt}
    });
    await tx.userBadge.upsert({
     where:{userId_key:{userId:remaining[0].userId,key:"TOURNAMENT_CHAMPION"}},
     create:{userId:remaining[0].userId,key:"TOURNAMENT_CHAMPION",name:"Tournament Champion",icon:"👑",featured:true},
     update:{featured:true}
    });
   }else{
    const tournament=await tx.battleTournament.findUnique({
     where:{id:battle.tournamentId},
     select:{currentRound:true,_count:{select:{entries:true}}}
    });
    const currentRound=tournament?.currentRound??battle.roundNumber??1;
    const totalEntries=tournament?._count.entries??remaining.length;
    const expectedRemaining=Math.max(1,Math.ceil(totalEntries/Math.pow(2,currentRound)));
    if(remaining.length<=expectedRemaining){
     await tx.battleTournament.update({
      where:{id:battle.tournamentId},
      data:{currentRound:{increment:1}}
     });
    }
   }
  }

  return tx.battle.update({
   where:{id:battle.id},
   data:{
    status:"ENDED",
    endedAt,
    winnerSide,
    finalizedAt:new Date(),
    featuredUntil
   },
   include:{teams:true}
  });
 },{isolationLevel:"Serializable"});
}
