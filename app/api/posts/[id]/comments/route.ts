import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {contactAllowed} from "@/lib/contactPrivacy";
import {getPostAccess} from "@/lib/postAccess";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const body=await request.json().catch(()=>null);
 const text=String(body?.body??"").trim().slice(0,1000);
 if(!text)return NextResponse.json({error:"Comment cannot be empty."},{status:400});

 const post=await getPostAccess(id,me.id);
 if(!post)return NextResponse.json({error:"Post unavailable."},{status:404});
 if(!await contactAllowed(me.id,post.authorId,post.author.commentPrivacy)){
  return NextResponse.json({error:"This account is not accepting comments from you."},{status:403});
 }

 const comment=await db.comment.create({data:{postId:id,authorId:me.id,body:text},select:{id:true,body:true,createdAt:true}});
 if(post.authorId!==me.id)await db.notification.create({data:{recipientId:post.authorId,actorId:me.id,type:"COMMENT",postId:id}});
 return NextResponse.json({comment},{status:201});
}
