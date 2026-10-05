import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {isAtLeast18} from "@/lib/age";
import {
 createConnectAccount,
 createConnectAccountLink,
 retrieveConnectAccount
} from "@/lib/stripe";

async function syncAccount(userId:string,providerRef:string){
 const [remote,local]=await Promise.all([
  retrieveConnectAccount(providerRef),
  db.creatorPayoutAccount.findUnique({where:{userId},select:{taxStatus:true}})
 ]);
 const complete=Boolean(remote.details_submitted&&remote.payouts_enabled);
 return db.creatorPayoutAccount.update({
  where:{userId},
  data:{
   payoutsEnabled:Boolean(remote.payouts_enabled),
   detailsSubmitted:Boolean(remote.details_submitted),
   identityStatus:complete?"VERIFIED":"PENDING",
   taxStatus:local?.taxStatus==="NOT_STARTED"?"PENDING_PROVIDER":undefined,
   onboardingCompleteAt:complete?new Date():null
  }
 });
}

export async function GET(){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const account=await db.creatorPayoutAccount.findUnique({where:{userId:me.id}});
 if(!account)return NextResponse.json({account:null});

 try{
  const updated=await syncAccount(me.id,account.providerRef);
  return NextResponse.json({account:updated});
 }catch(error){
  console.error("Stripe Connect status refresh failed",error);
  return NextResponse.json({account,error:"Payout provider status could not be refreshed."});
 }
}

export async function POST(){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const user=await db.user.findUnique({
  where:{id:me.id},
  select:{email:true,dateOfBirth:true,status:true}
 });
 if(!user||user.status!=="ACTIVE")return NextResponse.json({error:"Account unavailable."},{status:403});
 if(!isAtLeast18(user.dateOfBirth)){
  return NextResponse.json({error:"Creator payouts require an account age of 18 or older."},{status:403});
 }

 let account=await db.creatorPayoutAccount.findUnique({where:{userId:me.id}});

 try{
  if(!account){
   const remote=await createConnectAccount({userId:me.id,email:user.email});
   account=await db.creatorPayoutAccount.create({
    data:{
     userId:me.id,
     provider:"stripe",
     providerRef:remote.id,
     identityStatus:"PENDING",
     taxStatus:"PENDING_PROVIDER"
    }
   });
  }else{
   account=await syncAccount(me.id,account.providerRef);
  }

  if(account.payoutsEnabled&&account.detailsSubmitted){
   return NextResponse.json({
    account,
    onboardingComplete:true,
    taxVerificationRequired:account.taxStatus!=="VERIFIED"
   });
  }

  const appUrl=process.env.NEXT_PUBLIC_APP_URL;
  if(!appUrl)return NextResponse.json({error:"Payout onboarding is not configured."},{status:503});

  const link=await createConnectAccountLink({
   accountId:account.providerRef,
   refreshUrl:new URL("/wallet?payout=refresh",appUrl).toString(),
   returnUrl:new URL("/wallet?payout=complete",appUrl).toString()
  });

  return NextResponse.json({
   onboardingUrl:link.url,
   expiresAt:link.expires_at,
   onboardingComplete:false
  });
 }catch(error){
  console.error("Stripe Connect onboarding failed",error);
  return NextResponse.json({error:"Payout onboarding could not be prepared."},{status:503});
 }
}
