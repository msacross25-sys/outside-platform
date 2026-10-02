import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {verifyStripeWebhook} from "@/lib/stripe";

export const dynamic="force-dynamic";

type StripeEvent={
 id:string;
 type:string;
 data:{object:any};
};

async function activateBattlePassPurchase(args:{
 purchaseId:string;
 sessionId?:string|null;
 paymentIntentId?:string|null;
 amountTotal?:number|null;
 currency?:string|null;
}){
 return db.$transaction(async tx=>{
  const purchase=await tx.battlePassPurchase.findUnique({where:{id:args.purchaseId}});
  if(!purchase)throw new Error("BATTLE_PASS_PURCHASE_NOT_FOUND");
  if(args.amountTotal!=null&&args.amountTotal!==purchase.amountCents)throw new Error("BATTLE_PASS_AMOUNT_MISMATCH");
  if(args.currency&&args.currency.toLowerCase()!==purchase.currency.toLowerCase())throw new Error("BATTLE_PASS_CURRENCY_MISMATCH");
  if(args.sessionId&&purchase.providerSessionId&&args.sessionId!==purchase.providerSessionId)throw new Error("BATTLE_PASS_SESSION_MISMATCH");
  if(args.paymentIntentId&&purchase.providerPaymentId&&args.paymentIntentId!==purchase.providerPaymentId)throw new Error("BATTLE_PASS_PAYMENT_MISMATCH");

  if(purchase.status==="REFUNDED"||purchase.status==="CHARGEBACK")return purchase;

  const progress=await tx.battlePassProgress.findUnique({where:{userId:purchase.userId}});
  if(progress?.seasonKey===purchase.seasonKey){
   await tx.battlePassProgress.update({
    where:{userId:purchase.userId},
    data:{premiumActive:true}
   });
  }else{
   await tx.battlePassProgress.upsert({
    where:{userId:purchase.userId},
    create:{userId:purchase.userId,seasonKey:purchase.seasonKey,premiumActive:true,level:1},
    update:{seasonKey:purchase.seasonKey,freeXp:0,premiumXp:0,premiumActive:true,level:1}
   });
  }

  return tx.battlePassPurchase.update({
   where:{id:purchase.id},
   data:{
    status:"PAID",
    providerSessionId:args.sessionId??purchase.providerSessionId,
    providerPaymentId:args.paymentIntentId??purchase.providerPaymentId,
    paidAt:new Date(),
    refundedAt:null
   }
  });
 },{isolationLevel:"Serializable"});
}

async function reverseBattlePass(args:{
 paymentIntentId?:string|null;
 chargeId?:string|null;
 chargeback:boolean;
}){
 const where=args.paymentIntentId
  ?{providerPaymentId:args.paymentIntentId}
  :args.chargeId
   ?{providerChargeId:args.chargeId}
   :null;
 if(!where)return false;

 return db.$transaction(async tx=>{
  const purchase=await tx.battlePassPurchase.findFirst({where});
  if(!purchase)return false;

  await tx.battlePassPurchase.update({
   where:{id:purchase.id},
   data:{
    status:args.chargeback?"CHARGEBACK":"REFUNDED",
    providerChargeId:args.chargeId??purchase.providerChargeId,
    refundedAt:new Date()
   }
  });

  const progress=await tx.battlePassProgress.findUnique({where:{userId:purchase.userId}});
  if(progress?.seasonKey===purchase.seasonKey&&progress.premiumActive){
   await tx.battlePassProgress.update({
    where:{userId:purchase.userId},
    data:{premiumActive:false}
   });
  }
  return true;
 },{isolationLevel:"Serializable"});
}

async function creditPurchase(args:{
 purchaseId:string;
 sessionId?:string|null;
 paymentIntentId?:string|null;
 amountTotal?:number|null;
 currency?:string|null;
}){
 return db.$transaction(async tx=>{
  const purchase=await tx.coinPurchase.findUnique({where:{id:args.purchaseId}});
  if(!purchase)throw new Error("PURCHASE_NOT_FOUND");

  if(args.amountTotal!=null&&args.amountTotal!==purchase.amountCents)throw new Error("AMOUNT_MISMATCH");
  if(args.currency&&args.currency.toLowerCase()!==purchase.currency.toLowerCase())throw new Error("CURRENCY_MISMATCH");
  if(args.sessionId&&purchase.providerSessionId&&args.sessionId!==purchase.providerSessionId)throw new Error("SESSION_MISMATCH");
  if(args.paymentIntentId&&purchase.providerPaymentId&&args.paymentIntentId!==purchase.providerPaymentId)throw new Error("PAYMENT_MISMATCH");

  if(purchase.status==="PAID"||purchase.status==="REFUNDED"||purchase.status==="CHARGEBACK"){
   return purchase;
  }

  await tx.coinWallet.upsert({
   where:{userId:purchase.userId},
   create:{userId:purchase.userId,balanceCoins:purchase.coins},
   update:{balanceCoins:{increment:purchase.coins}}
  });

  return tx.coinPurchase.update({
   where:{id:purchase.id},
   data:{
    status:"PAID",
    providerSessionId:args.sessionId??purchase.providerSessionId,
    providerPaymentId:args.paymentIntentId??purchase.providerPaymentId,
    paidAt:new Date()
   }
  });
 },{isolationLevel:"Serializable"});
}

async function recordPaymentIntent(object:any){
 const paymentIntentId=typeof object?.id==="string"?object.id:null;
 if(!paymentIntentId)return;

 const chargeId=
  typeof object?.latest_charge==="string"
   ?object.latest_charge
   :typeof object?.latest_charge?.id==="string"
    ?object.latest_charge.id
    :null;

 const battlePassPurchaseId=String(object?.metadata?.battlePassPurchaseId??"");
 if(battlePassPurchaseId){
  await db.battlePassPurchase.updateMany({
   where:{id:battlePassPurchaseId},
   data:{
    providerPaymentId:paymentIntentId,
    providerChargeId:chargeId
   }
  });
  return;
 }

 const purchaseId=String(object?.metadata?.purchaseId??"");
 if(purchaseId){
  await db.coinPurchase.updateMany({
   where:{id:purchaseId},
   data:{
    providerPaymentId:paymentIntentId,
    providerChargeId:chargeId
   }
  });
  return;
 }

 await db.coinPurchase.updateMany({
  where:{providerPaymentId:paymentIntentId},
  data:{providerChargeId:chargeId}
 });
}

async function reverseCoins(args:{
 paymentIntentId?:string|null;
 chargeId?:string|null;
 refundedCents?:number|null;
 chargeback:boolean;
}){
 const where=args.paymentIntentId
  ?{providerPaymentId:args.paymentIntentId}
  :args.chargeId
   ?{providerChargeId:args.chargeId}
   :null;

 if(!where)return;

 await db.$transaction(async tx=>{
  const purchase=await tx.coinPurchase.findFirst({where});
  if(!purchase)return;

  const desiredReversal=args.chargeback
   ?purchase.coins
   :BigInt(Math.min(
      Number(purchase.coins),
      Math.ceil(Number(purchase.coins)*Math.max(0,args.refundedCents??0)/Math.max(1,purchase.amountCents))
    ));

  const delta=desiredReversal-purchase.reversedCoins;
  if(delta>0n){
   await tx.coinWallet.upsert({
    where:{userId:purchase.userId},
    create:{userId:purchase.userId,balanceCoins:-delta},
    update:{balanceCoins:{decrement:delta}}
   });
  }

  const refundedCents=args.chargeback
   ?purchase.amountCents
   :Math.max(purchase.refundedCents,args.refundedCents??0);

  await tx.coinPurchase.update({
   where:{id:purchase.id},
   data:{
    providerChargeId:args.chargeId??purchase.providerChargeId,
    reversedCoins:desiredReversal,
    refundedCents,
    refundedAt:new Date(),
    status:args.chargeback
     ?"CHARGEBACK"
     :refundedCents>=purchase.amountCents
      ?"REFUNDED"
      :"PAID"
   }
  });
 },{isolationLevel:"Serializable"});
}

export async function POST(request:Request){
 const signature=request.headers.get("stripe-signature");
 if(!signature)return NextResponse.json({error:"Unauthorized."},{status:401});

 const raw=await request.text();
 try{
  if(!verifyStripeWebhook(raw,signature)){
   return NextResponse.json({error:"Unauthorized."},{status:401});
  }
 }catch(error){
  console.error("Stripe webhook verification failed",error);
  return NextResponse.json({error:"Webhook verification unavailable."},{status:503});
 }

 let event:StripeEvent;
 try{
  event=JSON.parse(raw) as StripeEvent;
 }catch{
  return NextResponse.json({error:"Invalid payload."},{status:400});
 }

 try{
  const object=event.data?.object;

  if(event.type==="checkout.session.completed"||event.type==="checkout.session.async_payment_succeeded"){
   const metadataUserId=String(object?.metadata?.userId??"");
   const battlePassPurchaseId=String(object?.metadata?.battlePassPurchaseId??"");
   const purchaseId=String(object?.metadata?.purchaseId??"");

   if(battlePassPurchaseId&&String(object?.payment_status??"paid")==="paid"){
    const local=await db.battlePassPurchase.findUnique({where:{id:battlePassPurchaseId},select:{userId:true}});
    if(!local||!metadataUserId||metadataUserId!==local.userId)throw new Error("BATTLE_PASS_PURCHASE_USER_MISMATCH");
    await activateBattlePassPurchase({
     purchaseId:battlePassPurchaseId,
     sessionId:typeof object?.id==="string"?object.id:null,
     paymentIntentId:typeof object?.payment_intent==="string"?object.payment_intent:null,
     amountTotal:Number.isFinite(object?.amount_total)?Number(object.amount_total):null,
     currency:typeof object?.currency==="string"?object.currency:null
    });
   }else if(purchaseId&&String(object?.payment_status??"paid")==="paid"){
    const local=await db.coinPurchase.findUnique({where:{id:purchaseId},select:{userId:true}});
    if(!local||!metadataUserId||metadataUserId!==local.userId)throw new Error("PURCHASE_USER_MISMATCH");
    await creditPurchase({
     purchaseId,
     sessionId:typeof object?.id==="string"?object.id:null,
     paymentIntentId:typeof object?.payment_intent==="string"?object.payment_intent:null,
     amountTotal:Number.isFinite(object?.amount_total)?Number(object.amount_total):null,
     currency:typeof object?.currency==="string"?object.currency:null
    });
   }
  }else if(event.type==="payment_intent.succeeded"){
   await recordPaymentIntent(object);
  }else if(event.type==="checkout.session.async_payment_failed"||event.type==="payment_intent.payment_failed"){
   const battlePassPurchaseId=String(object?.metadata?.battlePassPurchaseId??"");
   const purchaseId=String(object?.metadata?.purchaseId??"");
   if(battlePassPurchaseId){
    await db.battlePassPurchase.updateMany({
     where:{id:battlePassPurchaseId,status:"PENDING"},
     data:{status:"FAILED"}
    });
   }else if(purchaseId){
    await db.coinPurchase.updateMany({
     where:{id:purchaseId,status:"PENDING"},
     data:{status:"FAILED"}
    });
   }
  }else if(event.type==="charge.refunded"){
   const reversedPass=await reverseBattlePass({
    paymentIntentId:typeof object?.payment_intent==="string"?object.payment_intent:null,
    chargeId:typeof object?.id==="string"?object.id:null,
    chargeback:false
   });
   if(!reversedPass){
    await reverseCoins({
     paymentIntentId:typeof object?.payment_intent==="string"?object.payment_intent:null,
     chargeId:typeof object?.id==="string"?object.id:null,
     refundedCents:Number.isFinite(object?.amount_refunded)?Number(object.amount_refunded):0,
     chargeback:false
    });
   }
  }else if(event.type==="charge.dispute.created"){
   const reversedPass=await reverseBattlePass({
    paymentIntentId:typeof object?.payment_intent==="string"?object.payment_intent:null,
    chargeId:typeof object?.charge==="string"?object.charge:null,
    chargeback:true
   });
   if(!reversedPass){
    await reverseCoins({
     paymentIntentId:typeof object?.payment_intent==="string"?object.payment_intent:null,
     chargeId:typeof object?.charge==="string"?object.charge:null,
     refundedCents:null,
     chargeback:true
    });
   }
  }

  return NextResponse.json({received:true});
 }catch(error){
  console.error("Stripe webhook processing failed",{eventId:event.id,eventType:event.type,error});
  return NextResponse.json({error:"Webhook processing failed."},{status:500});
 }
}
