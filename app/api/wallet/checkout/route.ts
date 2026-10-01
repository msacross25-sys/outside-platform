import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {isAtLeast18} from "@/lib/age";
import {coinPackageByKey} from "@/lib/coinPackages";
import {createCheckoutSession} from "@/lib/stripe";

export async function POST(request:Request){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const user=await db.user.findUnique({
  where:{id:me.id},
  select:{email:true,dateOfBirth:true,status:true}
 });
 if(!user||user.status!=="ACTIVE")return NextResponse.json({error:"Account unavailable."},{status:403});
 if(!isAtLeast18(user.dateOfBirth)){
  return NextResponse.json({error:"Coin purchases require an account age of 18 or older."},{status:403});
 }

 const body=await request.json().catch(()=>null);
 const pack=coinPackageByKey(String(body?.packageKey??""));
 if(!pack)return NextResponse.json({error:"Coin package not found."},{status:404});

 const purchase=await db.coinPurchase.create({
  data:{
   userId:me.id,
   provider:"stripe",
   amountCents:pack.amountCents,
   currency:"usd",
   coins:pack.coins,
   status:"PENDING"
  }
 });

 const appUrl=process.env.NEXT_PUBLIC_APP_URL;
 if(!appUrl){
  await db.coinPurchase.update({where:{id:purchase.id},data:{status:"FAILED"}});
  return NextResponse.json({error:"Checkout is not configured."},{status:503});
 }

 try{
  const session=await createCheckoutSession({
   purchaseId:purchase.id,
   userId:me.id,
   email:user.email,
   packageKey:pack.key,
   label:pack.label,
   amountCents:pack.amountCents,
   coins:pack.coins,
   successUrl:new URL("/wallet?purchase=success",appUrl).toString(),
   cancelUrl:new URL("/wallet?purchase=cancelled",appUrl).toString()
  });

  await db.coinPurchase.update({
   where:{id:purchase.id},
   data:{
    providerSessionId:session.id,
    providerPaymentId:typeof session.payment_intent==="string"?session.payment_intent:null
   }
  });

  if(!session.url)throw new Error("Checkout URL was not returned.");
  return NextResponse.json({
   checkoutUrl:session.url,
   purchaseId:purchase.id
  },{status:201});
 }catch(error){
  console.error("Stripe checkout creation failed",error);
  await db.coinPurchase.update({
   where:{id:purchase.id},
   data:{status:"FAILED"}
  });
  return NextResponse.json({error:"Checkout could not be created."},{status:503});
 }
}
