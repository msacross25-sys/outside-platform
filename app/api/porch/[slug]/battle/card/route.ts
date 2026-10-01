import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";

const DOUBLE_POINT_SECONDS=60;

export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const body=await request.json().catch(()=>null);
 const card=String(body?.card??"");
 if(card!=="DOUBLE_POINT")return NextResponse.json({error:"Unsupported battle card."},{status:400});

 const room=await db.porchRoom.findUnique({where:{slug},select:{id:true,status:true}});
 if(!room||room.status!=="LIVE")return NextResponse.json({error:"Live room not found."},{status:404});

 const battle=await db.battle.findFirst({
  where:{roomId:room.id,status:"LIVE"},
  orderBy:{startedAt:"desc"},
  include:{teams:true}
 });
 if(!battle)return NextResponse.json({error:"No active battle."},{status:409});

 const team=battle.teams.find(item=>item.memberIds.includes(me.id));
 if(!team)return NextResponse.json({error:"Only active battle participants can use battle cards."},{status:403});

 const now=new Date();
 if(team.multiplierExpiresAt&&team.multiplierExpiresAt>now&&team.activeMultiplier>1){
  return NextResponse.json({error:"A Double-Point Card is already active for your side."},{status:409});
 }

 try{
  const result=await db.$transaction(async tx=>{
   const inventory=await tx.battleRewardLedger.findFirst({
    where:{userId:me.id,currency:"CARD_DOUBLE_POINT",status:"AVAILABLE",amount:{gt:0}},
    orderBy:{createdAt:"asc"}
   });
   if(!inventory)throw new Error("NO_CARD");

   if(inventory.amount===1){
    await tx.battleRewardLedger.update({where:{id:inventory.id},data:{status:"CLAIMED"}});
   }else{
    await tx.battleRewardLedger.update({where:{id:inventory.id},data:{amount:{decrement:1}}});
   }

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
     metadataJson:JSON.stringify({side:team.side,expiresAt:expiresAt.toISOString()})
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
