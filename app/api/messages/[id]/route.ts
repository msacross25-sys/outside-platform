import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {createNotifications} from "@/lib/notifications";

async function access(userId:string,id:string){
 const member=await db.conversationMember.findUnique({
  where:{conversationId_userId:{conversationId:id,userId}},
  include:{
   conversation:{
    include:{
     members:{select:{userId:true,user:{select:{status:true}}}}
    }
   }
  }
 });
 if(!member)return null;

 const others=member.conversation.members.filter(
  (item:{userId:string;user:{status:string}})=>item.userId!==userId
 );
 if(others.some((item:{user:{status:string}})=>item.user.status!=="ACTIVE"))return null;

 const otherIds=others.map((item:{userId:string})=>item.userId);
 const blocked=otherIds.length?await db.block.count({
  where:{OR:[
   {blockerId:userId,blockedId:{in:otherIds}},
   {blockerId:{in:otherIds},blockedId:userId}
  ]}
 }):0;
 if(blocked)return null;

 const muted=otherIds.length?await db.mute.count({
  where:{muterId:userId,mutedId:{in:otherIds}}
 }):0;

 return muted?null:member;
}

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 if(!await access(me.id,id))return NextResponse.json({error:"Conversation unavailable."},{status:403});

 const messages=await db.message.findMany({
  where:{conversationId:id},
  orderBy:{createdAt:"asc"},
  take:200,
  include:{sender:{select:{username:true,displayName:true}}}
 });

 await db.conversationMember.update({
  where:{conversationId_userId:{conversationId:id,userId:me.id}},
  data:{lastReadAt:new Date()}
 });

 return NextResponse.json({messages});
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 if(!await access(me.id,id))return NextResponse.json({error:"Conversation unavailable."},{status:403});

 const body=await request.json().catch(()=>null);
 const text=String(body?.body??"").trim().slice(0,4000);
 if(!text)return NextResponse.json({error:"Message cannot be empty."},{status:400});

 const now=new Date();
 const message=await db.$transaction(async tx=>{
  await tx.conversation.update({where:{id},data:{updatedAt:now}});
  return tx.message.create({data:{conversationId:id,senderId:me.id,body:text}});
 });

 const recipients=await db.conversationMember.findMany({
  where:{conversationId:id,userId:{not:me.id}},
  select:{userId:true}
 });

 if(recipients.length){
  await createNotifications(recipients.map(recipient=>({
   recipientId:recipient.userId,
   actorId:me.id,
   type:"MESSAGE" as const,
   targetUrl:"/messages/"+id
  })));
 }

 return NextResponse.json({message},{status:201});
}
