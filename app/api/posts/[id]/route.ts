import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {readMediaContentToken} from "@/lib/mediaReceipt";
import {deleteStoredMedia} from "@/lib/mediaStorage";

function tokenFromMediaUrl(url:string){
 const prefix="/api/media/content/";
 if(!url.startsWith(prefix))return null;
 return url.slice(prefix.length);
}

export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const user=await currentUser();
 if(!user)return NextResponse.json({error:"Sign in required."},{status:401});

 const post=await db.post.findUnique({
  where:{id},
  select:{authorId:true,media:{select:{url:true}}}
 });
 if(!post)return NextResponse.json({error:"Post not found."},{status:404});
 if(post.authorId!==user.id)return NextResponse.json({error:"Post owner access required."},{status:403});

 const urls=post.media.map(item=>item.url);
 await db.post.delete({where:{id}});

 for(const url of urls){
  try{
   const stillUsed=await db.media.count({where:{url}});
   if(stillUsed>0)continue;
   const token=tokenFromMediaUrl(url);
   if(!token)continue;
   const payload=readMediaContentToken(token);
   if(payload)await deleteStoredMedia(payload.key);
  }catch(error){
   console.error("Published media cleanup failed after post deletion",error);
  }
 }

 return NextResponse.json({deleted:true});
}
