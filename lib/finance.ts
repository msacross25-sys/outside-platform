import {db} from "@/lib/db";

export async function financeStaff(userId:string){
 const staff=await db.staffProfile.findUnique({where:{userId}});
 return Boolean(staff?.active&&staff.role==="OWNER");
}

export function validGiftTransition(from:string,to:string){
 const allowed:Record<string,string[]>={
  PENDING:["SETTLED","REFUNDED","CHARGEBACK"],
  SETTLED:["REFUNDED","CHARGEBACK","ADJUSTED"],
  REFUNDED:[],
  CHARGEBACK:["ADJUSTED"],
  ADJUSTED:["REFUNDED","CHARGEBACK"]
 };
 return allowed[from]?.includes(to)??false;
}

export function giftLedgerDelta(from:string,to:string,creatorShareCents:number){
 if(from==="PENDING"&&to==="SETTLED")return creatorShareCents;
 if(from==="SETTLED"&&(to==="REFUNDED"||to==="CHARGEBACK"))return -creatorShareCents;
 return 0;
}

export function validPayoutTransition(from:string,to:string){
 const allowed:Record<string,string[]>={
  PENDING:["PROCESSING","CANCELLED"],
  PROCESSING:["PAID","FAILED","CANCELLED"],
  FAILED:["PENDING","CANCELLED"],
  PAID:[],
  CANCELLED:[]
 };
 return allowed[from]?.includes(to)??false;
}

export function payoutLedgerDelta(from:string,to:string,amountCents:number){
 if((from==="PENDING"||from==="PROCESSING")&&(to==="CANCELLED"||to==="FAILED"))return -amountCents;
 if(from==="FAILED"&&to==="PENDING")return amountCents;
 return 0;
}
