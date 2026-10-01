import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";

type Scope="daily"|"weekly"|"monthly"|"regional"|"global";

function startFor(scope:Scope,now=new Date()){
 if(scope==="daily")return new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
 if(scope==="weekly"){
  const day=(now.getUTCDay()+6)%7;
  return new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-day));
 }
 if(scope==="monthly"||scope==="regional")return new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
 return null;
}

export async function GET(request:Request){
 const url=new URL(request.url);
 const requested=String(url.searchParams.get("scope")??"daily").toLowerCase();
 const scope=(["daily","weekly","monthly","regional","global"].includes(requested)?requested:"daily") as Scope;
 const me=await currentUser();
 let region=url.searchParams.get("region")?.trim().toUpperCase().slice(0,12)||null;

 if(scope==="regional"&&!region&&me){
  region=(await db.user.findUnique({where:{id:me.id},select:{regionCode:true}}))?.regionCode??null;
 }

 if(scope==="regional"&&!region){
  return NextResponse.json({scope,region:null,rankings:[],needsRegion:true});
 }

 const start=startFor(scope);
 const grouped=await db.battleParticipantResult.groupBy({
  by:["userId"],
  where:{
   ...(start?{createdAt:{gte:start}}:{}),
   ...(scope==="regional"?{regionCode:region}: {})
  },
  _sum:{rankingPoints:true,battlePoints:true},
  _count:{_all:true},
  orderBy:{_sum:{rankingPoints:"desc"}},
  take:100
 });

 const userIds=grouped.map(row=>row.userId);
 const users=await db.user.findMany({
  where:{id:{in:userIds},status:"ACTIVE"},
  select:{
   id:true,
   username:true,
   displayName:true,
   avatarUrl:true,
   regionCode:true,
   battleProfile:{
    select:{wins:true,losses:true,ties:true,currentWinStreak:true,bestWinStreak:true,rankTitle:true,featuredUntil:true,hallOfFame:true}
   }
  }
 });
 const userMap=new Map(users.map(user=>[user.id,user]));

 const rankings=grouped.flatMap((row,index)=>{
  const user=userMap.get(row.userId);
  if(!user)return [];
  return [{
   rank:index+1,
   userId:user.id,
   username:user.username,
   displayName:user.displayName,
   avatarUrl:user.avatarUrl,
   regionCode:user.regionCode,
   rankingPoints:row._sum.rankingPoints??0,
   battlePoints:row._sum.battlePoints??0,
   battles:row._count._all,
   profile:user.battleProfile
  }];
 });

 return NextResponse.json({scope,region,rankings});
}
