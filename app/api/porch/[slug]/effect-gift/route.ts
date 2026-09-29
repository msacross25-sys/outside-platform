import {NextResponse} from "next/server";
import {isAtLeast18} from "@/lib/age";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {effectByKey} from "@/lib/liveEffects";
import {getLiveMemberAccess} from "@/lib/porchAccess";

export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const buyer=await db.user.findUnique({where:{id:me.id},select:{dateOfBirth:true}});
 if(!isAtLeast18(buyer?.dateOfBirth))return NextResponse.json({error:"Purchasing or sending gifts requires an account age of 18 or older."},{status:403});
 const body=await request.json().catch(()=>null);
 const effect=effectByKey(String(body?.effectKey??""));
 if(!effect||!effect.coins)return NextResponse.json({error:"This effect is not giftable."},{status:400});
 const access=await getLiveMemberAccess(slug,me.id);
 if(!access)return NextResponse.json({error:"Join the Live before sending an effect gift."},{status:403});
 const host=access.room.members.find(m=>m.role==="HOST");
 if(!host||host.userId===me.id)return NextResponse.json({error:"Effect cannot be gifted to yourself."},{status:400});
 const cost=BigInt(effect.coins);
 try{
  await db.$transaction(async tx=>{
   const wallet=await tx.coinWallet.findUnique({where:{userId:me.id}});
   if(!wallet||wallet.balanceCoins<cost)throw new Error("LOW_BALANCE");
   const existing=await tx.hostCosmetic.findUnique({where:{userId_effectKey:{userId:host.userId,effectKey:effect.key}}});
   if(existing)throw new Error("ALREADY_OWNED");
   await tx.coinWallet.update({where:{userId:me.id},data:{balanceCoins:{decrement:cost}}});
   await tx.cosmeticGift.create({data:{senderId:me.id,hostId:host.userId,effectKey:effect.key,coinCost:cost}});
   await tx.hostCosmetic.create({data:{userId:host.userId,effectKey:effect.key,source:"GIFT"}});
  },{isolationLevel:"Serializable"});
  return NextResponse.json({gifted:true,effectKey:effect.key,hostControlsActivation:true});
 }catch(error){
  const message=error instanceof Error&&error.message==="LOW_BALANCE"?"Not enough coins.":error instanceof Error&&error.message==="ALREADY_OWNED"?"The host already owns this effect.":"Unable to gift effect.";
  return NextResponse.json({error:message},{status:409});
 }
}
