import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {financeStaff} from "@/lib/finance";
import {MINIMUM_PAYOUT_CENTS} from "@/lib/gifts";

export async function GET(request:Request){
 const me=await currentUser();
 if(!me||!await financeStaff(me.id)){
  return NextResponse.json({error:"Owner finance access required."},{status:403});
 }

 const url=new URL(request.url);
 const cursor=(url.searchParams.get("cursor")??"").trim()||null;
 const requested=Number(url.searchParams.get("limit")??100);
 const limit=Number.isFinite(requested)?Math.min(200,Math.max(1,requested)):100;

 const creators=await db.user.findMany({
  where:{receivedGiftTransactions:{some:{status:"SETTLED"}}},
  orderBy:{id:"asc"},
  take:limit+1,
  ...(cursor?{cursor:{id:cursor},skip:1}:{}),
  select:{
   id:true,
   username:true,
   displayName:true,
   status:true,
   hostApplication:{
    select:{
     identityVerificationStatus:true,
     taxStatus:true,
     payoutEnabled:true
    }
   },
   payoutAccount:{
    select:{
     provider:true,
     payoutsEnabled:true,
     detailsSubmitted:true,
     onboardingCompleteAt:true
    }
   }
  }
 });

 const hasMore=creators.length>limit;
 const page=hasMore?creators.slice(0,limit):creators;
 const ids=page.map(user=>user.id);

 if(!ids.length){
  return NextResponse.json({queue:[],nextCursor:null});
 }

 const cutoff=new Date(Date.now()-30*86400000);
 const [earnedGroups,reservedGroups,openPayouts,exceptionGroups]=await Promise.all([
  db.giftTransaction.groupBy({
   by:["recipientId"],
   where:{recipientId:{in:ids},status:"SETTLED"},
   _sum:{creatorShareCents:true}
  }),
  db.creatorPayout.groupBy({
   by:["creatorId"],
   where:{creatorId:{in:ids},status:{in:["PENDING","PROCESSING","PAID"]}},
   _sum:{amountCents:true}
  }),
  db.creatorPayout.findMany({
   where:{creatorId:{in:ids},status:{in:["PENDING","PROCESSING"]}},
   orderBy:{createdAt:"desc"}
  }),
  db.giftTransaction.groupBy({
   by:["recipientId"],
   where:{
    recipientId:{in:ids},
    status:{in:["CHARGEBACK","ADJUSTED"]},
    createdAt:{gte:cutoff}
   },
   _count:{_all:true}
  })
 ]);

 const earned=new Map(earnedGroups.map(row=>[row.recipientId,row._sum.creatorShareCents??0]));
 const reserved=new Map(reservedGroups.map(row=>[row.creatorId,row._sum.amountCents??0]));
 const exceptions=new Map(exceptionGroups.map(row=>[row.recipientId,row._count._all]));
 const openByCreator=new Map<string,(typeof openPayouts)[number]>();
 for(const payout of openPayouts){
  if(!openByCreator.has(payout.creatorId))openByCreator.set(payout.creatorId,payout);
 }

 const queue=[];
 for(const user of page){
  const available=Math.max(0,(earned.get(user.id)??0)-(reserved.get(user.id)??0));
  const open=openByCreator.get(user.id)??null;
  const exceptionCount=exceptions.get(user.id)??0;

  if(available<MINIMUM_PAYOUT_CENTS&&!open)continue;

  const application=user.hostApplication;
  queue.push({
   creator:user,
   availableCents:available,
   eligible:
    available>=MINIMUM_PAYOUT_CENTS&&
    user.status==="ACTIVE"&&
    Boolean(user.payoutAccount?.payoutsEnabled&&user.payoutAccount?.detailsSubmitted)&&
    exceptionCount===0,
   financialReviewRequired:exceptionCount>0,
   openPayout:open
  });
 }

 return NextResponse.json({
  queue,
  nextCursor:hasMore?page.at(-1)?.id??null:null
 });
}
