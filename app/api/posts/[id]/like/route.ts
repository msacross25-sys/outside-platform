import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {getPostAccess} from "@/lib/postAccess";
import {createNotification} from "@/lib/notifications";

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const post=await getPostAccess(id,me.id);
 if(!post)return NextResponse.json({error:"Post unavailable."},{status:404});
 const existing=await db.reaction.findUnique({where:{userId_postId:{userId:me.id,postId:id}}});
 await db.reaction.upsert({where:{userId_postId:{userId:me.id,postId:id}},create:{userId:me.id,postId:id},update:{}});
 if(!existing&&post.authorId!==me.id)await createNotification({recipientId:post.authorId,actorId:me.id,type:"LIKE",postId:id,targetUrl:"/post/"+id});
 return NextResponse.json({liked:true});
}

export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 await db.reaction.deleteMany({where:{userId:me.id,postId:id}});
 return NextResponse.json({liked:false});
}
