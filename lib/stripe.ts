import {createHmac,timingSafeEqual} from "node:crypto";

export function stripeTestMode(){
 return process.env.STRIPE_TEST_MODE==="true";
}

function secret(){
 const value=process.env.STRIPE_SECRET_KEY;
 if(!value)throw new Error("STRIPE_SECRET_KEY is not configured.");
 return value;
}

function apiBase(){
 return "https://api.stripe.com/v1";
}

async function stripeRequest<T>(path:string,body:URLSearchParams,idempotencyKey?:string):Promise<T>{
 const headers:Record<string,string>={
  authorization:"Bearer "+secret(),
  "content-type":"application/x-www-form-urlencoded"
 };
 if(idempotencyKey)headers["idempotency-key"]=idempotencyKey;

 const response=await fetch(apiBase()+path,{
  method:"POST",
  headers,
  body,
  cache:"no-store"
 });
 const data=await response.json();
 if(!response.ok){
  throw new Error(data?.error?.message??"Stripe request failed.");
 }
 return data as T;
}

export async function createCheckoutSession(args:{
 purchaseId:string;
 userId:string;
 email:string;
 packageKey:string;
 label:string;
 amountCents:number;
 coins:bigint;
 successUrl:string;
 cancelUrl:string;
){
 if(stripeTestMode()){
  return {
   id:"cs_test_"+args.purchaseId,
   url:"https://checkout.stripe.example.test/"+args.purchaseId,
   payment_intent:"pi_test_"+args.purchaseId
  };
 }
 const body=new URLSearchParams();
 body.set("mode","payment");
 body.set("success_url",args.successUrl);
 body.set("cancel_url",args.cancelUrl);
 body.set("customer_email",args.email);
 body.set("client_reference_id",args.userId);
 body.set("metadata[purchaseId]",args.purchaseId);
 body.set("metadata[userId]",args.userId);
 body.set("metadata[packageKey]",args.packageKey);
 body.set("metadata[coins]",args.coins.toString());
 body.set("line_items[0][quantity]","1");
 body.set("line_items[0][price_data][currency]","usd");
 body.set("line_items[0][price_data][unit_amount]",String(args.amountCents));
 body.set("line_items[0][price_data][product_data][name]",args.label+" OUTSiiDE Coins");
 body.set("payment_intent_data[metadata][purchaseId]",args.purchaseId);
 body.set("payment_intent_data[metadata][userId]",args.userId);

 return stripeRequest<{id:string;url:string|null;payment_intent?:string|null}>(
  "/checkout/sessions",
  body,
  "checkout_"+args.purchaseId
 );
}

export async function createConnectAccount(args:{userId:string;email:string}){
 if(stripeTestMode())return {id:"acct_test_"+args.userId};
 const body=new URLSearchParams();
 body.set("type","express");
 body.set("country","US");
 body.set("email",args.email);
 body.set("metadata[userId]",args.userId);
 body.set("capabilities[transfers][requested]","true");
 return stripeRequest<{id:string}>(
  "/accounts",
  body,
  "connect_account_"+args.userId
 );
}

export async function createConnectAccountLink(args:{accountId:string;refreshUrl:string;returnUrl:string}){
 if(stripeTestMode())return {url:args.returnUrl+"?stripe_test=1",expires_at:Math.floor(Date.now()/1000)+300};
 const body=new URLSearchParams();
 body.set("account",args.accountId);
 body.set("refresh_url",args.refreshUrl);
 body.set("return_url",args.returnUrl);
 body.set("type","account_onboarding");
 return stripeRequest<{url:string;expires_at:number}>("/account_links",body);
}

export async function retrieveConnectAccount(accountId:string){
 if(stripeTestMode())return {id:accountId,charges_enabled:true,payouts_enabled:true,details_submitted:true};
 const response=await fetch(apiBase()+"/accounts/"+encodeURIComponent(accountId),{
  headers:{authorization:"Bearer "+secret()},
  cache:"no-store"
 });
 const data=await response.json();
 if(!response.ok)throw new Error(data?.error?.message??"Stripe account lookup failed.");
 return data as {id:string;charges_enabled:boolean;payouts_enabled:boolean;details_submitted:boolean};
}

export async function createConnectTransfer(args:{
 payoutId:string;
 destination:string;
 amountCents:number;
}){
 if(stripeTestMode())return {id:"tr_test_"+args.payoutId,amount:args.amountCents,destination:args.destination};
 const body=new URLSearchParams();
 body.set("amount",String(args.amountCents));
 body.set("currency","usd");
 body.set("destination",args.destination);
 body.set("metadata[payoutId]",args.payoutId);
 return stripeRequest<{id:string;amount:number;destination:string}>(
  "/transfers",
  body,
  "payout_"+args.payoutId
 );
}

function parseStripeSignature(value:string){
 const parts=value.split(",").map(item=>item.trim());
 const timestamp=parts.find(x=>x.startsWith("t="))?.slice(2);
 const signatures=parts.filter(x=>x.startsWith("v1=")).map(x=>x.slice(3));
 return {timestamp,signatures};
}

export function verifyStripeWebhook(raw:string,signatureHeader:string){
 const webhookSecret=process.env.STRIPE_WEBHOOK_SECRET;
 if(!webhookSecret)throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");

 const {timestamp,signatures}=parseStripeSignature(signatureHeader);
 if(!timestamp||!signatures.length)return false;

 const ts=Number(timestamp);
 if(!Number.isFinite(ts))return false;
 if(Math.abs(Date.now()/1000-ts)>300)return false;

 const expected=createHmac("sha256",webhookSecret)
  .update(timestamp+"."+raw)
  .digest("hex");

 const expectedBuffer=Buffer.from(expected);
 return signatures.some(sig=>{
  const actual=Buffer.from(sig);
  return actual.length===expectedBuffer.length&&timingSafeEqual(actual,expectedBuffer);
 });
}
