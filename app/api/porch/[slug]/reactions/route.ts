import {NextResponse} from "next/server";
import {currentUser} from "@/lib/session";
import {getLiveMemberAccess,getPorchAccess} from "@/lib/porchAccess";
import {checkActionLimit} from "@/lib/actionLimit";
import {incrementLiveReactionCount,readLiveReactionCount} from "@/lib/liveScale";

export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const limit=await checkActionLimit(request,"live-reaction",me.id,20,10000);
 if(!limit.allowed){
  return NextResponse.json(
   {error:limit.unavailable?"Reactions are temporarily unavailable.":"Reaction limit reached."},
   {status:limit.unavailable?503:429,headers:{"Retry-After":String(limit.retryAfterSeconds)}}
  );
 }

 const access=await getLiveMemberAccess(slug,me.id);
 if(!access)return NextResponse.json({error:"Live room access required."},{status:403});

 const body=await request.json().catch(()=>null);
 const emoji=String(body?.emoji??"❤️").slice(0,8);
 if(!emoji)return NextResponse.json({error:"Reaction required."},{status:400});

 const count=await incrementLiveReactionCount(access.room.id);
 if(count===null)return NextResponse.json({error:"Reactions are temporarily unavailable."},{status:503});

 return NextResponse.json({ok:true,count});
}

export async function GET(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 const access=await getPorchAccess(slug,me?.id);
 if(!access.room||!access.allowed)return NextResponse.json({error:"Room not found."},{status:404});

 const live=await readLiveReactionCount(access.room.id);
 return NextResponse.json({count:live??access.room.reactionCount});
}
