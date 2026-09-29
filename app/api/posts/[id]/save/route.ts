import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {getPostAccess} from "@/lib/postAccess";

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const post=await getPostAccess(id,me.id);
 if(!post)return NextResponse.json({error:"Post unavailable."},{status:404});
 await db.save.upsert({where:{userId_postId:{userId:me.id,postId:id}},create:{userId:me.id,postId:id},update:{}});
 return NextResponse.json({saved:true});
}

export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 await db.save.deleteMany({where:{userId:me.id,postId:id}});
 return NextResponse.json({saved:false});
}
