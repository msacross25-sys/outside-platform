import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {mediaAllowed} from "@/lib/media";
import {readMediaReceipt} from "@/lib/mediaReceipt";

export async function POST(request:Request){
 const user=await currentUser();
 if(!user)return NextResponse.json({error:"Sign in required."},{status:401});

 const body=await request.json().catch(()=>null);
 if(!body)return NextResponse.json({error:"Invalid request."},{status:400});

 const caption=String(body.caption??"").trim().slice(0,2200);
 const rawMedia=Array.isArray(body.media)?body.media:[];
 if(rawMedia.length>10)return NextResponse.json({error:"A post can contain up to 10 media items."},{status:400});

 const verifiedMedia=[];
 const keys=new Set<string>();

 for(const item of rawMedia){
  const receipt=readMediaReceipt(String(item?.receipt??""),"COMPLETE");
  if(!receipt||receipt.userId!==user.id||!mediaAllowed(receipt.contentType,receipt.size)){
   return NextResponse.json({error:"One or more media items are invalid or expired."},{status:400});
  }
  if(keys.has(receipt.key)){
   return NextResponse.json({error:"Duplicate media items are not allowed."},{status:400});
  }
  keys.add(receipt.key);
  verifiedMedia.push(receipt);
 }

 if(!caption&&verifiedMedia.length===0){
  return NextResponse.json({error:"Add text or media first."},{status:400});
 }

 const post=await db.post.create({
  data:{
   authorId:user.id,
   caption,
   visibility:"PUBLIC",
   media:{
    create:verifiedMedia.map((item,position)=>({
     type:item.kind,
     url:item.url,
     posterUrl:null,
     position
    }))
   }
  },
  select:{id:true,caption:true,createdAt:true}
 });

 return NextResponse.json({post},{status:201});
}
