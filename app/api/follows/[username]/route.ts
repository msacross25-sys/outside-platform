import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {checkActionLimit} from "@/lib/actionLimit";
import {createNotification} from "@/lib/notifications";

export async function POST(request:Request,{params}:{params:Promise<{username:string}>}){
 const {username}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const limit=await checkActionLimit(request,"follow",me.id,30,60000);
 if(!limit.allowed){
  return NextResponse.json({
   error:limit.unavailable?"Follow actions are temporarily unavailable.":"Follow rate limit reached."
  },{
   status:limit.unavailable?503:429,
   headers:{"Retry-After":String(limit.retryAfterSeconds)}
  });
 }

 const target=await db.user.findUnique({
  where:{username:username.toLowerCase()},
  select:{id:true,username:true,status:true,privacy:true}
 });
 if(!target||target.status!=="ACTIVE")return NextResponse.json({error:"User not found."},{status:404});
 if(target.id===me.id)return NextResponse.json({error:"You cannot follow yourself."},{status:400});

 const blocked=await db.block.count({
  where:{OR:[
   {blockerId:me.id,blockedId:target.id},
   {blockerId:target.id,blockedId:me.id}
  ]}
 });
 if(blocked)return NextResponse.json({error:"Follow unavailable."},{status:403});

 const existing=await db.follow.findUnique({
  where:{followerId_followingId:{followerId:me.id,followingId:target.id}}
 });
 if(existing)return NextResponse.json({following:true});

 if(target.privacy==="PRIVATE"){
  const existingRequest=await db.followRequest.findUnique({
   where:{requesterId_targetId:{requesterId:me.id,targetId:target.id}}
  });
  const requestRow=await db.followRequest.upsert({
   where:{requesterId_targetId:{requesterId:me.id,targetId:target.id}},
   create:{requesterId:me.id,targetId:target.id},
   update:{status:"PENDING",reviewedAt:null}
  });

  if(!existingRequest||existingRequest.status!=="PENDING"){
   await createNotification({
    recipientId:target.id,
    actorId:me.id,
    type:"FOLLOW_REQUEST",
    targetUrl:"/notifications"
   });
  }

  return NextResponse.json({
   following:false,
   requested:true,
   requestId:requestRow.id
  },{status:202});
 }

 await db.$transaction(async tx=>{
  await tx.follow.create({data:{followerId:me.id,followingId:target.id}});
  await createNotification({
   recipientId:target.id,
   actorId:me.id,
   type:"FOLLOW",
   targetUrl:"/u/"+me.username
  },tx);
 });

 const count=await db.follow.count({where:{followingId:target.id}});
 if([100,500,1000,2500,5000,10000,25000].includes(count)){
  await createNotification({
   recipientId:target.id,
   actorId:me.id,
   type:"FOLLOWER_MILESTONE",
   targetUrl:"/u/"+target.username
  });
 }

 return NextResponse.json({following:true});
}

export async function DELETE(request:Request,{params}:{params:Promise<{username:string}>}){
 const {username}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const limit=await checkActionLimit(request,"unfollow",me.id,60,60000);
 if(!limit.allowed){
  return NextResponse.json({
   error:limit.unavailable?"Follow actions are temporarily unavailable.":"Follow rate limit reached."
  },{
   status:limit.unavailable?503:429,
   headers:{"Retry-After":String(limit.retryAfterSeconds)}
  });
 }

 const target=await db.user.findUnique({
  where:{username:username.toLowerCase()},
  select:{id:true}
 });
 if(!target)return NextResponse.json({error:"User not found."},{status:404});

 await db.$transaction([
  db.follow.deleteMany({where:{followerId:me.id,followingId:target.id}}),
  db.followRequest.deleteMany({where:{requesterId:me.id,targetId:target.id}})
 ]);

 return NextResponse.json({following:false,requested:false});
}
