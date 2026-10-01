import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {BATTLE_PASS_REWARDS,battlePassLevel} from "@/lib/battleRewardCatalog";

type Track="FREE"|"PREMIUM";

export async function POST(request:Request){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const body=await request.json().catch(()=>null);
 const level=Number(body?.level);
 const track=String(body?.track??"FREE").toUpperCase() as Track;
 if(!["FREE","PREMIUM"].includes(track))return NextResponse.json({error:"Invalid Battle Pass track."},{status:400});

 const reward=BATTLE_PASS_REWARDS.find(item=>item.level===level);
 if(!reward)return NextResponse.json({error:"Battle Pass reward not found."},{status:404});

 const pass=await db.battlePassProgress.findUnique({where:{userId:me.id}});
 if(!pass)return NextResponse.json({error:"Battle Pass progress is not available yet."},{status:409});

 const currentLevel=battlePassLevel(pass.freeXp);
 if(currentLevel<level)return NextResponse.json({error:"That Battle Pass level is still locked."},{status:409});
 if(track==="PREMIUM"&&!pass.premiumActive)return NextResponse.json({error:"Premium Battle Pass is not active."},{status:403});

 const markerKind="BATTLE_PASS_"+track+"_L"+level;
 const existing=await db.battleRewardLedger.findFirst({
  where:{userId:me.id,kind:markerKind,status:"CLAIMED"}
 });
 if(existing)return NextResponse.json({error:"That Battle Pass reward was already claimed."},{status:409});

 const label=track==="FREE"?reward.free:reward.premium;

 await db.$transaction(async tx=>{
  if(track==="FREE"){
   if(level===2){
    await tx.battleRewardLedger.create({data:{userId:me.id,kind:"BATTLE_PASS_REWARD",currency:"BATTLE_TOKEN",amount:100,status:"AVAILABLE",metadataJson:JSON.stringify({level,track,label})}});
   }else if(level===5){
    await tx.battleRewardLedger.create({data:{userId:me.id,kind:"BATTLE_PASS_REWARD",currency:"GEM",amount:50,status:"AVAILABLE",metadataJson:JSON.stringify({level,track,label})}});
   }else if(level===10){
    await tx.battleRewardLedger.create({data:{userId:me.id,kind:"BATTLE_PASS_REWARD",currency:"BATTLE_TOKEN",amount:250,status:"AVAILABLE",metadataJson:JSON.stringify({level,track,label})}});
   }else if(level===20){
    await tx.battleRewardLedger.create({data:{userId:me.id,kind:"BATTLE_PASS_REWARD",currency:"GEM",amount:100,status:"AVAILABLE",metadataJson:JSON.stringify({level,track,label})}});
   }else if(level===30){
    await tx.battleRewardLedger.create({data:{userId:me.id,kind:"BATTLE_PASS_REWARD",currency:"BATTLE_TOKEN",amount:500,status:"AVAILABLE",metadataJson:JSON.stringify({level,track,label})}});
   }else if(level===50){
    await tx.userBadge.upsert({
     where:{userId_key:{userId:me.id,key:"BATTLE_PASS_SEASON_BADGE_"+pass.seasonKey}},
     create:{userId:me.id,key:"BATTLE_PASS_SEASON_BADGE_"+pass.seasonKey,name:"Battle Pass Season "+pass.seasonKey,icon:"🎫",featured:true},
     update:{featured:true}
    });
   }
  }else{
   const cosmeticByLevel:Record<number,string>={
    2:"battle-victory-frame",
    5:"battle-gift-animation",
    10:"battle-vip-name",
    30:"battle-legend-entrance",
    50:"battle-premium-season-frame"
   };
   if(cosmeticByLevel[level]){
    await tx.hostCosmetic.upsert({
     where:{userId_effectKey:{userId:me.id,effectKey:cosmeticByLevel[level]}},
     create:{userId:me.id,effectKey:cosmeticByLevel[level],source:"BATTLE_PASS_"+pass.seasonKey},
     update:{source:"BATTLE_PASS_"+pass.seasonKey}
    });
   }else if(level===20){
    await tx.userBadge.upsert({
     where:{userId_key:{userId:me.id,key:"BATTLE_ADVANCED_ANALYTICS"}},
     create:{userId:me.id,key:"BATTLE_ADVANCED_ANALYTICS",name:"Advanced Battle Analytics",icon:"📊",featured:false},
     update:{}
    });
   }
  }

  await tx.battleRewardLedger.create({
   data:{
    userId:me.id,
    kind:markerKind,
    currency:"MARKER",
    amount:0,
    status:"CLAIMED",
    metadataJson:JSON.stringify({level,track,label,seasonKey:pass.seasonKey})
   }
  });
 });

 return NextResponse.json({ok:true,level,track,label});
}
