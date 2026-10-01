import {db} from "@/lib/db";
import {TERRITORY_DAILY_BATTLE_TOKENS} from "@/lib/battles";

function mondayUtc(date:Date){
 const day=(date.getUTCDay()+6)%7;
 return new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()-day));
}

function monthStart(date:Date){
 return new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1));
}

function quarterStart(date:Date){
 return new Date(Date.UTC(date.getUTCFullYear(),Math.floor(date.getUTCMonth()/3)*3,1));
}

function keyDate(date:Date){
 return date.toISOString().slice(0,10);
}

function monthKey(date:Date){
 return date.getUTCFullYear()+"-"+String(date.getUTCMonth()+1).padStart(2,"0");
}

function quarterKey(date:Date){
 return date.getUTCFullYear()+"-Q"+(Math.floor(date.getUTCMonth()/3)+1);
}

async function alreadyAwarded(kind:string,key:string){
 return db.battleRewardLedger.findFirst({
  where:{kind,metadataJson:{contains:'"periodKey":"'+key+'"'}}
 });
}

export async function runBattleRollups(now=new Date()){
 const results:{territories?:any;weekly?:any;monthly?:any;season?:any}={};

 // Daily Kingdom territory rewards.
 const todayKey=keyDate(now);
 const currentSeason=quarterKey(now);
 const territories=await db.battleTerritory.findMany({
  where:{seasonKey:currentSeason,holderGuildId:{not:null}},
  include:{
   holderGuild:{
    include:{members:{select:{userId:true}}}
   }
  }
 });
 let territoryAwards=0;

 for(const territory of territories){
  if(!territory.holderGuildId||!territory.holderGuild)continue;
  const marker=await db.battleRewardLedger.findFirst({
   where:{
    kind:"TERRITORY_DAILY_ROLLUP",
    metadataJson:{contains:'"territoryId":"'+territory.id+'"'},
    AND:{metadataJson:{contains:'"periodKey":"'+todayKey+'"'}}
   }
  });
  if(marker)continue;

  await db.$transaction(async tx=>{
   for(const member of territory.holderGuild!.members){
    await tx.battleRewardLedger.create({
     data:{
      userId:member.userId,
      kind:"TERRITORY_DAILY_REWARD",
      currency:"BATTLE_TOKEN",
      amount:TERRITORY_DAILY_BATTLE_TOKENS,
      status:"AVAILABLE",
      metadataJson:JSON.stringify({
       territoryId:territory.id,
       regionCode:territory.regionCode,
       periodKey:todayKey,
       guildId:territory.holderGuildId
      })
     }
    });
   }
   await tx.battleRewardLedger.create({
    data:{
     kind:"TERRITORY_DAILY_ROLLUP",
     currency:"MARKER",
     amount:0,
     status:"CLAIMED",
     metadataJson:JSON.stringify({
      territoryId:territory.id,
      regionCode:territory.regionCode,
      periodKey:todayKey,
      guildId:territory.holderGuildId
     })
    }
   });
  });
  territoryAwards++;
 }
 results.territories={periodKey:todayKey,territoriesAwarded:territoryAwards};

 // Previous completed week.
 const currentWeek=mondayUtc(now);
 const previousWeek=new Date(currentWeek.getTime()-7*86400000);
 const weekKey=keyDate(previousWeek);

 if(!await alreadyAwarded("WEEKLY_JACKPOT_AWARDED",weekKey)){
  const [reserve,leaders]=await Promise.all([
   db.battleRewardLedger.findMany({
    where:{kind:"WEEKLY_JACKPOT_RESERVE",status:"RESERVED",createdAt:{gte:previousWeek,lt:currentWeek}}
   }),
   db.battleParticipantResult.groupBy({
    by:["userId"],
    where:{createdAt:{gte:previousWeek,lt:currentWeek}},
    _sum:{rankingPoints:true},
    orderBy:{_sum:{rankingPoints:"desc"}},
    take:1
   })
  ]);

  const amount=reserve.reduce((sum,row)=>sum+row.amount,0);
  const winner=leaders[0]?.userId;
  if(amount>0&&winner){
   await db.$transaction(async tx=>{
    await tx.battleEarning.create({
     data:{battleId:null,userId:winner,kind:"WEEKLY_JACKPOT",amountCents:amount,status:"PENDING"}
    });
    await tx.battleRewardLedger.create({
     data:{
      userId:winner,
      kind:"WEEKLY_JACKPOT_AWARDED",
      currency:"CASH_CENTS",
      amount,
      status:"RESERVED",
      metadataJson:JSON.stringify({periodKey:weekKey})
     }
    });
    await tx.battleRewardLedger.updateMany({
     where:{id:{in:reserve.map(row=>row.id)}},
     data:{status:"CLAIMED"}
    });
    await tx.userBadge.upsert({
     where:{userId_key:{userId:winner,key:"WEEKLY_BATTLE_WINNER_"+weekKey}},
     create:{userId:winner,key:"WEEKLY_BATTLE_WINNER_"+weekKey,name:"Weekly Battle Winner",icon:"🏆",featured:true},
     update:{featured:true}
    });
   });
   results.weekly={winner,amountCents:amount,periodKey:weekKey};
  }
 }

 // Previous completed month.
 const currentMonth=monthStart(now);
 const previousMonth=monthStart(new Date(currentMonth.getTime()-86400000));
 const mKey=monthKey(previousMonth);

 if(!await alreadyAwarded("MONTHLY_BATTLE_ROLLUP",mKey)){
  const [champions,gifters]=await Promise.all([
   db.battleParticipantResult.groupBy({
    by:["userId"],
    where:{createdAt:{gte:previousMonth,lt:currentMonth}},
    _sum:{rankingPoints:true},
    orderBy:{_sum:{rankingPoints:"desc"}},
    take:1
   }),
   db.giftTransaction.groupBy({
    by:["senderId"],
    where:{battleId:{not:null},createdAt:{gte:previousMonth,lt:currentMonth}},
    _sum:{dollarValueCents:true},
    orderBy:{_sum:{dollarValueCents:"desc"}},
    take:1
   })
  ]);

  const champion=champions[0]?.userId;
  const topGifter=gifters[0]?.senderId;

  await db.$transaction(async tx=>{
   if(champion){
    await tx.userBadge.upsert({
     where:{userId_key:{userId:champion,key:"MONTHLY_BATTLE_CHAMPION_"+mKey}},
     create:{userId:champion,key:"MONTHLY_BATTLE_CHAMPION_"+mKey,name:"Monthly Battle Champion",icon:"👑",featured:true},
     update:{featured:true}
    });
   }
   if(topGifter){
    await tx.userBadge.upsert({
     where:{userId_key:{userId:topGifter,key:"TOP_GIFTER_"+mKey}},
     create:{userId:topGifter,key:"TOP_GIFTER_"+mKey,name:"Top Gifter Leader",icon:"💎",featured:true},
     update:{featured:true}
    });
   }
   await tx.battleRewardLedger.create({
    data:{
     kind:"MONTHLY_BATTLE_ROLLUP",
     currency:"MARKER",
     amount:0,
     status:"CLAIMED",
     metadataJson:JSON.stringify({periodKey:mKey,champion,topGifter})
    }
   });
  });

  results.monthly={champion,topGifter,periodKey:mKey};
 }

 // Previous completed quarter / season.
 const currentQuarter=quarterStart(now);
 const previousQuarter=quarterStart(new Date(currentQuarter.getTime()-86400000));
 const qKey=quarterKey(previousQuarter);

 if(!await alreadyAwarded("SEASON_CHAMPIONSHIP_AWARDED",qKey)){
  const [reserve,globalRanks,regionalRanks]=await Promise.all([
   db.battleRewardLedger.findMany({
    where:{kind:"SEASON_CHAMPIONSHIP_RESERVE",status:"RESERVED",createdAt:{gte:previousQuarter,lt:currentQuarter}}
   }),
   db.battleParticipantResult.groupBy({
    by:["userId"],
    where:{createdAt:{gte:previousQuarter,lt:currentQuarter}},
    _sum:{rankingPoints:true},
    orderBy:{_sum:{rankingPoints:"desc"}},
    take:100
   }),
   db.battleParticipantResult.groupBy({
    by:["regionCode","userId"],
    where:{regionCode:{not:null},createdAt:{gte:previousQuarter,lt:currentQuarter}},
    _sum:{rankingPoints:true},
    orderBy:{_sum:{rankingPoints:"desc"}},
    take:1000
   })
  ]);

  const champion=globalRanks[0]?.userId;
  const amount=reserve.reduce((sum,row)=>sum+row.amount,0);

  if(champion||globalRanks.length){
   await db.$transaction(async tx=>{
    if(champion&&amount>0){
     await tx.battleEarning.create({
      data:{battleId:null,userId:champion,kind:"SEASON_CHAMPIONSHIP_PRIZE",amountCents:amount,status:"PENDING"}
     });
    }

    for(let i=0;i<globalRanks.length;i++){
     const row=globalRanks[i];
     await tx.userBadge.upsert({
      where:{userId_key:{userId:row.userId,key:"GLOBAL_TOP_100_"+qKey}},
      create:{userId:row.userId,key:"GLOBAL_TOP_100_"+qKey,name:"Global Top 100 · "+qKey,icon:i<10?"🌎":"🎖️",featured:i<10},
      update:{featured:i<10}
     });
    }

    const byRegion=new Map<string,typeof regionalRanks>();
    for(const row of regionalRanks){
     if(!row.regionCode)continue;
     const list=byRegion.get(row.regionCode)??[];
     if(list.length<10)list.push(row);
     byRegion.set(row.regionCode,list);
    }
    for(const [region,list] of byRegion){
     for(let i=0;i<list.length;i++){
      const row=list[i];
      await tx.userBadge.upsert({
       where:{userId_key:{userId:row.userId,key:"REGIONAL_TOP_10_"+region+"_"+qKey}},
       create:{userId:row.userId,key:"REGIONAL_TOP_10_"+region+"_"+qKey,name:"Regional Top 10 · "+region+" · "+qKey,icon:"🌎",featured:i<3},
       update:{featured:i<3}
      });
     }
    }

    if(reserve.length){
     await tx.battleRewardLedger.updateMany({
      where:{id:{in:reserve.map(row=>row.id)}},
      data:{status:"CLAIMED"}
     });
    }

    await tx.battleRewardLedger.create({
     data:{
      userId:champion??null,
      kind:"SEASON_CHAMPIONSHIP_AWARDED",
      currency:"CASH_CENTS",
      amount,
      status:"RESERVED",
      metadataJson:JSON.stringify({periodKey:qKey,champion,globalTop100:globalRanks.length})
     }
    });

    if(champion){
     await tx.userBadge.upsert({
      where:{userId_key:{userId:champion,key:"SEASON_CHAMPION_"+qKey}},
      create:{userId:champion,key:"SEASON_CHAMPION_"+qKey,name:"Season Champion · "+qKey,icon:"🏆",featured:true},
      update:{featured:true}
     });
    }
   });

   results.season={champion,amountCents:amount,periodKey:qKey,globalTop100:globalRanks.length};
  }
 }

 return results;
}
