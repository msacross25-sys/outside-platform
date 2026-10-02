import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {isAtLeast18} from "@/lib/age";
import {checkActionLimit} from "@/lib/actionLimit";
import {battlePassPriceCents,battleSeasonKey} from "@/lib/battlePass";
import {createBattlePassCheckoutSession} from "@/lib/stripe";

export async function POST(request:Request){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const limit=await checkActionLimit(request,"battle-pass-checkout",me.id,4,60_000);
 if(!limit.allowed){
  return NextResponse.json(
   {error:limit.unavailable?"Checkout is temporarily unavailable.":"Too many checkout attempts. Try again shortly."},
   {status:limit.unavailable?503:429,headers:{"Retry-After":String(limit.retryAfterSeconds)}}
  );
 }

 const user=await db.user.findUnique({
  where:{id:me.id},
  select:{email:true,dateOfBirth:true,status:true}
 });
 if(!user||user.status!=="ACTIVE")return NextResponse.json({error:"Account unavailable."},{status:403});
 if(!isAtLeast18(user.dateOfBirth)){
  return NextResponse.json({error:"Premium Battle Pass purchases require an account age of 18 or older."},{status:403});
 }

 const seasonKey=battleSeasonKey();
 const amountCents=battlePassPriceCents();
 const [pass,existing]=await Promise.all([
  db.battlePassProgress.findUnique({where:{userId:me.id}}),
  db.battlePassPurchase.findUnique({where:{userId_seasonKey:{userId:me.id,seasonKey}}})
 ]);

 if(pass?.premiumActive&&pass.seasonKey===seasonKey){
  return NextResponse.json({error:"Premium Battle Pass is already active for this season.",active:true},{status:409});
 }

 if(existing?.status==="PAID"){
  await db.battlePassProgress.upsert({
   where:{userId:me.id},
   create:{userId:me.id,seasonKey,premiumActive:true,level:1},
   update:{seasonKey,premiumActive:true}
  });
  return NextResponse.json({error:"Premium Battle Pass is already paid for this season.",active:true},{status:409});
 }

 const purchase=existing
  ?await db.battlePassPurchase.update({
    where:{id:existing.id},
    data:{
     provider:"stripe",
     amountCents,
     currency:"usd",
     status:"PENDING",
     providerSessionId:null,
     providerPaymentId:null,
     providerChargeId:null,
     paidAt:null,
     refundedAt:null
    }
   })
  :await db.battlePassPurchase.create({
    data:{
     userId:me.id,
     seasonKey,
     provider:"stripe",
     amountCents,
     currency:"usd",
     status:"PENDING"
    }
   });

 const appUrl=process.env.NEXT_PUBLIC_APP_URL;
 if(!appUrl){
  await db.battlePassPurchase.update({where:{id:purchase.id},data:{status:"FAILED"}});
  return NextResponse.json({error:"Battle Pass checkout is not configured."},{status:503});
 }

 try{
  const session=await createBattlePassCheckoutSession({
   purchaseId:purchase.id,
   userId:me.id,
   email:user.email,
   seasonKey,
   amountCents,
   successUrl:new URL("/battles/rewards?battlePass=success",appUrl).toString(),
   cancelUrl:new URL("/battles/rewards?battlePass=cancelled",appUrl).toString()
  });

  await db.battlePassPurchase.update({
   where:{id:purchase.id},
   data:{
    providerSessionId:session.id,
    providerPaymentId:typeof session.payment_intent==="string"?session.payment_intent:null
   }
  });

  if(!session.url)throw new Error("Checkout URL was not returned.");
  return NextResponse.json({
   checkoutUrl:session.url,
   purchaseId:purchase.id,
   seasonKey,
   amountCents
  },{status:201});
 }catch(error){
  console.error("Battle Pass checkout creation failed",error);
  await db.battlePassPurchase.update({where:{id:purchase.id},data:{status:"FAILED"}});
  return NextResponse.json({error:"Battle Pass checkout could not be created."},{status:503});
 }
}
