import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";

export async function GET(request:Request){
 const me=await currentUser();
 const url=new URL(request.url);
 const cursor=(url.searchParams.get("cursor")??"").trim()||null;
 const requested=Number(url.searchParams.get("limit")??25);
 const limit=Number.isFinite(requested)?Math.min(50,Math.max(1,requested)):25;

 let excluded:string[]=[];
 if(me){
  const [blocks,mutes]=await Promise.all([
   db.block.findMany({
    where:{OR:[{blockerId:me.id},{blockedId:me.id}]},
    select:{blockerId:true,blockedId:true}
   }),
   db.mute.findMany({
    where:{muterId:me.id},
    select:{mutedId:true}
   })
  ]);
  excluded=[
   ...new Set([
    ...blocks.flatMap(x=>[x.blockerId,x.blockedId]),
    ...mutes.map(x=>x.mutedId)
   ])
  ].filter(id=>id!==me.id);
 }

 const posts=await db.post.findMany({
  where:{
   visibility:"PUBLIC",
   author:{status:"ACTIVE"},
   authorId:excluded.length?{notIn:excluded}:undefined
  },
  orderBy:[{createdAt:"desc"},{id:"desc"}],
  take:limit+1,
  ...(cursor?{cursor:{id:cursor},skip:1}:{}),
  include:{
   author:{select:{username:true,displayName:true,avatarUrl:true}},
   media:{orderBy:{position:"asc"}},
   reactions:me?{where:{userId:me.id},select:{userId:true}}:false,
   saves:me?{where:{userId:me.id},select:{userId:true}}:false,
   _count:{select:{reactions:true,comments:true,saves:true}}
  }
 });

 const hasMore=posts.length>limit;
 const page=hasMore?posts.slice(0,limit):posts;
 const items=page.map(post=>({
  ...post,
  liked:me?post.reactions.length>0:false,
  saved:me?post.saves.length>0:false,
  reactions:undefined,
  saves:undefined
 }));

 return NextResponse.json({
  posts:items,
  nextCursor:hasMore?page.at(-1)?.id??null:null
 });
}
