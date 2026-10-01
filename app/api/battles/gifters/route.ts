import {NextResponse} from "next/server";
import {db} from "@/lib/db";

type Scope="daily"|"weekly"|"monthly"|"global";

function startFor(scope:Scope,now=new Date()){
 if(scope==="daily")return new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
 if(scope==="weekly"){
  const day=(now.getUTCDay()+6)%7;
  return new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-day));
 }
 if(scope==="monthly")return new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
 return null;
}

export async function GET(request:Request){
 const requested=String(new URL(request.url).searchParams.get("scope")??"monthly").toLowerCase();
 const scope=(["daily","weekly","monthly","global"].includes(requested)?requested:"monthly") as Scope;
 const start=startFor(scope);

 const grouped=await db.giftTransaction.groupBy({
  by:["senderId"],
  where:{
   battleId:{not:null},
   ...(start?{createdAt:{gte:start}}:{})
  },
  _sum:{dollarValueCents:true,battlePoints:true},
  _count:{_all:true},
  orderBy:{_sum:{dollarValueCents:"desc"}},
  take:50
 });

 const users=await db.user.findMany({
  where:{id:{in:grouped.map(row=>row.senderId)},status:"ACTIVE"},
  select:{id:true,username:true,displayName:true,avatarUrl:true}
 });
 const map=new Map(users.map(user=>[user.id,user]));

 return NextResponse.json({
  scope,
  gifters:grouped.flatMap((row,index)=>{
   const user=map.get(row.senderId);
   return user?[{
    rank:index+1,
    ...user,
    giftValueCents:row._sum.dollarValueCents??0,
    battlePoints:row._sum.battlePoints??0,
    gifts:row._count._all
   }]:[];
  })
 });
}
