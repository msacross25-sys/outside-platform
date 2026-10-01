import {NextResponse} from "next/server";
import {currentUser} from "@/lib/session";
import {db} from "@/lib/db";
import {getLiveMemberAccess,getPorchAccess} from "@/lib/porchAccess";
import {checkActionLimit} from "@/lib/actionLimit";
import {incrementLiveReactionCount,readLiveReactionCount} from "@/lib/liveScale";
import {broadcastLivekitData} from "@/lib/livekit";

const STANDARD_REACTIONS=["❤️","🔥","😂","👏","💜"] as const;
const BATTLE_EMOJI_REACTIONS=["⚡","👑","💎","🚀","🏆","🛡️"] as const;

async function reactionOptions(userId?:string){
 if(!userId)return [...STANDARD_REACTIONS];
 const selection=await db.battleCosmeticSelection.findUnique({
  where:{userId},
  select:{emojiKey:true}
 });
 return selection?.emojiKey
  ?[...STANDARD_REACTIONS,...BATTLE_EMOJI_REACTIONS]
  :[...STANDARD_REACTIONS];
}

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
 const allowed=await reactionOptions(me.id);
 if(!allowed.includes(emoji as (typeof allowed)[number])){
  return NextResponse.json({error:"That Live reaction is not unlocked."},{status:403});
 }

 const count=await incrementLiveReactionCount(access.room.id);
 if(count===null)return NextResponse.json({error:"Reactions are temporarily unavailable."},{status:503});
 try{await broadcastLivekitData(access.room.id,"outside.reaction",{count,emoji})}catch(error){console.error("Live reaction broadcast failed",error)}
 return NextResponse.json({ok:true,count,emoji});
}

export async function GET(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 const access=await getPorchAccess(slug,me?.id);
 if(!access.room||!access.allowed)return NextResponse.json({error:"Room not found."},{status:404});

 const [live,options]=await Promise.all([
  readLiveReactionCount(access.room.id),
  reactionOptions(me?.id)
 ]);
 return NextResponse.json({count:live??access.room.reactionCount,reactionOptions:options});
}
