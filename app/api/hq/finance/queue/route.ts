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
  where:{OR:[{receivedGiftTransactions:{some:{status:"SETTLED"}}},{battleEarnings:{some:{status:"SETTLED"}}}]},
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
     identityStatus:true,
     taxStatus:true,
     taxFormType:true,
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
 const [giftEarnedGroups,battleEarnedGroups,reservedGroups,openPayouts,giftExceptionGroups,battleExceptionGroups]=await Promise.all([
  db.giftTransaction.groupBy({
   by:["recipientId"],
   where:{recipientId:{in:ids},status:"SETTLED"},
   _sum:{creatorShareCents:true}
  }),
  db.battleEarning.groupBy({
   by:["userId"],
   where:{userId:{in:ids},status:"SETTLED"},
   _sum:{amountCents:true}
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
  }),
  db.battleEarning.groupBy({
   by:["userId"],
   where:{
    userId:{in:ids},
    status:{in:["CHARGEBACK","ADJUSTED"]},
    createdAt:{gte:cutoff}
   },
   _count:{_all:true}
  })
 ]);

 const giftEarned=new Map(giftEarnedGroups.map(row=>[row.recipientId,row._sum.creatorShareCents??0]));
 const battleEarned=new Map(battleEarnedGroups.map(row=>[row.userId,row._sum.amountCents??0]));
 const reserved=new Map(reservedGroups.map(row=>[row.creatorId,row._sum.amountCents??0]));
 const giftExceptions=new Map(giftExceptionGroups.map(row=>[row.recipientId,row._count._all]));
 const battleExceptions=new Map(battleExceptionGroups.map(row=>[row.userId,row._count._all]));
 const openByCreator=new Map<string,(typeof openPayouts)[number]>();
 for(const payout of openPayouts){
  if(!openByCreator.has(payout.creatorId))openByCreator.set(payout.creatorId,payout);
 }

 const queue=[];
 for(const user of page){
  const available=Math.max(
   0,
   (giftEarned.get(user.id)??0)+(battleEarned.get(user.id)??0)-(reserved.get(user.id)??0)
  );
  const open=openByCreator.get(user.id)??null;
  const exceptionCount=(giftExceptions.get(user.id)??0)+(battleExceptions.get(user.id)??0);

  if(available<MINIMUM_PAYOUT_CENTS&&!open)continue;

  queue.push({
   creator:user,
   availableCents:available,
   eligible:
    available>=MINIMUM_PAYOUT_CENTS&&
    user.status==="ACTIVE"&&
    Boolean(
     user.payoutAccount?.payoutsEnabled&&
     user.payoutAccount?.detailsSubmitted&&
     user.payoutAccount?.identityStatus==="VERIFIED"&&
     user.payoutAccount?.taxStatus==="VERIFIED"
    )&&
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
