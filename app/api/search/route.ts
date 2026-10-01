import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {checkActionLimit} from "@/lib/actionLimit";

export async function GET(request:Request){
 const me=await currentUser();
 const limit=await checkActionLimit(request,"search",me?.id,30,60000);
 if(!limit.allowed)return NextResponse.json({error:limit.unavailable?"Search is temporarily unavailable.":"Search rate limit reached."},{status:limit.unavailable?503:429,headers:{"Retry-After":String(limit.retryAfterSeconds)}});

 const q=new URL(request.url).searchParams.get("q")?.trim().slice(0,80)??"";
 if(q.length<2)return NextResponse.json({users:[],posts:[]});

 let excluded:string[]=[];
 if(me){
  const blocks=await db.block.findMany({where:{OR:[{blockerId:me.id},{blockedId:me.id}]},select:{blockerId:true,blockedId:true}});
  excluded=Array.from(new Set<string>(blocks.flatMap((x:{blockerId:string;blockedId:string})=>[x.blockerId,x.blockedId]))).filter(x=>x!==me.id);
 }

 const userWhere:any={
  status:"ACTIVE",
  id:excluded.length?{notIn:excluded}:undefined,
  OR:[
   {username:{contains:q,mode:"insensitive"}},
   {displayName:{contains:q,mode:"insensitive"}}
  ]
 };

 const [featured,regular,posts]=await Promise.all([
  db.user.findMany({
   where:{...userWhere,battleProfile:{featuredUntil:{gt:new Date()}}},
   take:8,
   select:{username:true,displayName:true,bio:true,avatarUrl:true,battleProfile:{select:{rankTitle:true,featuredUntil:true}}}
  }),
  db.user.findMany({
   where:userWhere,
   take:20,
   select:{username:true,displayName:true,bio:true,avatarUrl:true,battleProfile:{select:{rankTitle:true,featuredUntil:true}}}
  }),
  db.post.findMany({
   where:{visibility:"PUBLIC",caption:{contains:q,mode:"insensitive"},author:{status:"ACTIVE",id:excluded.length?{notIn:excluded}:undefined}},
   take:20,
   orderBy:{createdAt:"desc"},
   include:{author:{select:{username:true,displayName:true}},media:{orderBy:{position:"asc"}}}
  })
 ]);

 const seen=new Set<string>();
 const users=[...featured,...regular].filter(user=>{
  if(seen.has(user.username))return false;
  seen.add(user.username);
  return true;
 }).slice(0,12);

 return NextResponse.json({
  users:users.map(user=>({...user,battleFeatured:!!user.battleProfile?.featuredUntil})),
  posts
 });
}
