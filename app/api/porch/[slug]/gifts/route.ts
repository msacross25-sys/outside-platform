import {NextResponse} from "next/server";
import {isAtLeast18} from "@/lib/age";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {giftByKey,splitGift} from "@/lib/gifts";
import {verifiedHours} from "@/lib/progression";
import {getLiveMemberAccess} from "@/lib/porchAccess";
import {checkActionLimit} from "@/lib/actionLimit";
import {battleSplit,surgeMultiplier} from "@/lib/battles";
import {finalizeBattle} from "@/lib/battleEngine";

function splitAcross(total:number,userIds:string[]){
 const ids=[...new Set(userIds)];
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

export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const limit=await checkActionLimit(request,"live-gift",me.id,10,10000);
 if(!limit.allowed)return NextResponse.json({error:limit.unavailable?"Gifting is temporarily unavailable.":"Gift rate limit reached."},{status:limit.unavailable?503:429,headers:{"Retry-After":String(limit.retryAfterSeconds)}});

 const buyer=await db.user.findUnique({where:{id:me.id},select:{dateOfBirth:true}});
 if(!isAtLeast18(buyer?.dateOfBirth))return NextResponse.json({error:"Purchasing or sending gifts requires an account age of 18 or older."},{status:403});

 const body=await request.json().catch(()=>null),gift=giftByKey(String(body?.giftKey??""));
 if(!gift)return NextResponse.json({error:"Gift not found."},{status:404});
 if(gift.premium&&body?.confirmed!==true)return NextResponse.json({error:"This premium gift requires confirmation.",requiresConfirmation:true},{status:409});

 const access=await getLiveMemberAccess(slug,me.id);
 if(!access||!access.room.giftsEnabled)return NextResponse.json({error:"Gifts can only be sent in an accessible live room."},{status:403});
 const room=access.room,host=room.members.find(m=>m.role==="HOST");
 if(!host)return NextResponse.json({error:"Host not found."},{status:404});
 if(host.userId===me.id)return NextResponse.json({error:"You cannot send a gift to yourself."},{status:400});

 const activeBattle=await db.battle.findFirst({
  where:{roomId:room.id,status:"LIVE"},
  orderBy:{startedAt:"desc"},
  include:{teams:true}
 });

 if(activeBattle){
  const deadline=(activeBattle.startedAt?.getTime()??0)+activeBattle.durationMinutes*60000;
  if(deadline&&Date.now()>=deadline){
   await finalizeBattle(activeBattle.id,new Date(deadline));
   return NextResponse.json({error:"That battle just ended. Choose a regular gift or wait for the next battle."},{status:409});
  }

  const requestedSide=Number(body?.battleSide);
  if(requestedSide!==1&&requestedSide!==2)return NextResponse.json({error:"Choose Side 1 or Side 2 for this battle gift."},{status:400});
  const team=activeBattle.teams.find(item=>item.side===requestedSide);
  if(!team||!team.memberIds.length)return NextResponse.json({error:"That battle side is unavailable."},{status:409});
  const participantIds=new Set(activeBattle.teams.flatMap(item=>item.memberIds));
  if(participantIds.has(me.id))return NextResponse.json({error:"Battle participants cannot send gifts during their own active match."},{status:400});

  const split=battleSplit(gift.valueCents);
  const referral=await db.referralAttribution.findUnique({
   where:{referredUserId:me.id},
   include:{referrer:{select:{status:true}}}
  });
  const referrerId=referral?.referrer.status==="ACTIVE"?referral.referrerId:null;
  const surge=surgeMultiplier(activeBattle.startedAt,activeBattle.durationMinutes);
  const cardMultiplier=team.multiplierExpiresAt&&team.multiplierExpiresAt>new Date()?Math.max(1,team.activeMultiplier):1;
  const multiplier=Math.min(4,surge*cardMultiplier);
  const awardedPoints=gift.coins*multiplier;
  const creatorShares=splitAcross(split.creatorShareCents,team.memberIds);

  try{
   const transaction=await db.$transaction(async tx=>{
    const wallet=await tx.coinWallet.findUnique({where:{userId:me.id}});
    if(!wallet||wallet.balanceCoins<BigInt(gift.coins))throw new Error("INSUFFICIENT_COINS");

    await tx.coinWallet.update({
     where:{userId:me.id},
     data:{balanceCoins:{decrement:BigInt(gift.coins)}}
    });

    const giftTransaction=await tx.giftTransaction.create({
     data:{
      senderId:me.id,
      recipientId:host.userId,
      roomId:room.id,
      battleId:activeBattle.id,
      battleSide:requestedSide,
      battlePoints:awardedPoints,
      battleMultiplier:multiplier,
      battleRewardPoolCents:split.rewardPoolCents,
      referralRewardCents:split.referralShareCents,
      giftKey:gift.key,
      giftName:gift.name,
      coinCost:BigInt(gift.coins),
      dollarValueCents:gift.valueCents,
      creatorShareCents:split.creatorShareCents,
      platformShareCents:split.platformShareCents,
      status:"PENDING"
     }
    });

    for(const [userId,amountCents] of creatorShares){
     if(amountCents<=0)continue;
     await tx.battleEarning.create({
      data:{
       battleId:activeBattle.id,
       userId,
       giftTransactionId:giftTransaction.id,
       kind:"BATTLE_GIFT_SHARE",
       amountCents,
       status:"PENDING"
      }
     });
    }

    if(referrerId&&split.referralShareCents>0){
     await tx.battleEarning.create({
      data:{
       battleId:activeBattle.id,
       userId:referrerId,
       giftTransactionId:giftTransaction.id,
       kind:"BATTLE_REFERRAL_REWARD",
       amountCents:split.referralShareCents,
       status:"PENDING"
      }
     });
    }

    const updatedTeam=await tx.battleTeam.updateMany({
     where:{battleId:activeBattle.id,side:requestedSide},
     data:{
      score:{increment:awardedPoints},
      basePoints:{increment:gift.coins},
      cardPoints:{increment:gift.coins*(cardMultiplier-1)},
      surgePoints:{increment:awardedPoints-gift.coins*cardMultiplier},
      giftValueCents:{increment:gift.valueCents}
     }
    });
    if(updatedTeam.count!==1)throw new Error("BATTLE_SIDE_UNAVAILABLE");

    await tx.battle.update({
     where:{id:activeBattle.id},
     data:{
      totalGiftValueCents:{increment:gift.valueCents},
      creatorPoolCents:{increment:split.creatorShareCents},
      platformRevenueCents:{increment:split.platformShareCents},
      rewardPoolCents:{increment:split.rewardPoolCents},
      referralReserveCents:{increment:split.referralShareCents}
     }
    });

    await tx.battleRewardLedger.create({
     data:{
      battleId:activeBattle.id,
      userId:referrerId,
      kind:referrerId?"REFERRAL_REWARD_ALLOCATED":"REFERRAL_RESERVE",
      currency:"CASH_CENTS",
      amount:split.referralShareCents,
      status:"RESERVED",
      metadataJson:JSON.stringify({giftTransactionId:giftTransaction.id,senderId:me.id,referrerId})
     }
    });

    return giftTransaction;
   },{isolationLevel:"Serializable"});

   return NextResponse.json({
    gift:{id:transaction.id,name:gift.name,coins:gift.coins,valueCents:gift.valueCents},
    battle:{
     side:requestedSide,
     basePoints:gift.coins,
     multiplier,
     points:awardedPoints,
     lastMinuteSurge:surge>1,
     cardMultiplier
    },
    split
   });
  }catch(error){
   if(error instanceof Error&&error.message==="INSUFFICIENT_COINS")return NextResponse.json({error:"Not enough coins."},{status:409});
   if(error instanceof Error&&error.message==="BATTLE_SIDE_UNAVAILABLE")return NextResponse.json({error:"That battle side is no longer available."},{status:409});
   return NextResponse.json({error:"Battle gift could not be sent. Please try again."},{status:409});
  }
 }

 const [recipientFollowers,recipientProgress,hostApplication]=await Promise.all([
  db.follow.count({where:{followingId:host.userId}}),
  db.viewingProgress.findUnique({where:{userId:host.userId}}),
  db.hostApplication.findUnique({where:{userId:host.userId},select:{status:true}})
 ]);
 const recipientHours=verifiedHours(recipientProgress?.verifiedSeconds??0);
 const creatorSharePercent=hostApplication?.status==="APPROVED"&&recipientFollowers>=5000&&recipientHours>=4000?40:30;
 const split=splitGift(gift.valueCents,creatorSharePercent);

 try{
  const transaction=await db.$transaction(async tx=>{
   const wallet=await tx.coinWallet.findUnique({where:{userId:me.id}});
   if(!wallet||wallet.balanceCoins<BigInt(gift.coins))throw new Error("INSUFFICIENT_COINS");
   await tx.coinWallet.update({where:{userId:me.id},data:{balanceCoins:{decrement:BigInt(gift.coins)}}});
   return tx.giftTransaction.create({
    data:{
     senderId:me.id,
     recipientId:host.userId,
     roomId:room.id,
     giftKey:gift.key,
     giftName:gift.name,
     coinCost:BigInt(gift.coins),
     dollarValueCents:gift.valueCents,
     creatorShareCents:split.creatorShareCents,
     platformShareCents:split.platformShareCents,
     status:"PENDING"
    }
   });
  },{isolationLevel:"Serializable"});

  return NextResponse.json({
   gift:{id:transaction.id,name:gift.name,coins:gift.coins,valueCents:gift.valueCents},
   creatorSharePercent,
   creatorShareCents:split.creatorShareCents,
   platformShareCents:split.platformShareCents,
   battle:null
  });
 }catch(error){
  if(error instanceof Error&&error.message==="INSUFFICIENT_COINS")return NextResponse.json({error:"Not enough coins."},{status:409});
  return NextResponse.json({error:"Gift could not be sent. Please try again."},{status:409});
 }
}
