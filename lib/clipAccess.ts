import {db} from "@/lib/db";

type ClipAccessShape={
 creatorId:string;
 visibility:string;
 creator?:{status:string}|null;
};

export async function canViewClip(clip:ClipAccessShape,viewerId?:string|null){
 if(clip.creator?.status&&clip.creator.status!=="ACTIVE")return false;
 if(viewerId===clip.creatorId)return true;
 if(!viewerId)return clip.visibility==="PUBLIC";

 const [blocked,muted,follows]=await Promise.all([
  db.block.count({
   where:{OR:[
    {blockerId:viewerId,blockedId:clip.creatorId},
    {blockerId:clip.creatorId,blockedId:viewerId}
   ]}
  }),
  db.mute.count({where:{muterId:viewerId,mutedId:clip.creatorId}}),
  db.follow.findUnique({
   where:{followerId_followingId:{followerId:viewerId,followingId:clip.creatorId}},
   select:{followerId:true}
  })
 ]);

 if(blocked||muted)return false;
 if(clip.visibility==="PUBLIC")return true;
 if(clip.visibility==="FOLLOWERS")return Boolean(follows);
 return false;
}

export async function filterViewableClips<T extends ClipAccessShape>(clips:T[],viewerId?:string|null){
 const active=clips.filter(clip=>!clip.creator?.status||clip.creator.status==="ACTIVE");

 if(!viewerId){
  return active.filter(clip=>clip.visibility==="PUBLIC");
 }

 const creatorIds=[...new Set(active.map(clip=>clip.creatorId).filter(id=>id!==viewerId))];
 if(!creatorIds.length)return active;

 const [blocks,mutes,follows]=await Promise.all([
  db.block.findMany({
   where:{OR:[
    {blockerId:viewerId,blockedId:{in:creatorIds}},
    {blockedId:viewerId,blockerId:{in:creatorIds}}
   ]},
   select:{blockerId:true,blockedId:true}
  }),
  db.mute.findMany({
   where:{muterId:viewerId,mutedId:{in:creatorIds}},
   select:{mutedId:true}
  }),
  db.follow.findMany({
   where:{followerId:viewerId,followingId:{in:creatorIds}},
   select:{followingId:true}
  })
 ]);

 const blockedIds=new Set<string>();
 for(const block of blocks){
  blockedIds.add(block.blockerId===viewerId?block.blockedId:block.blockerId);
 }
 const mutedIds=new Set(mutes.map(x=>x.mutedId));
 const followedIds=new Set(follows.map(x=>x.followingId));

 return active.filter(clip=>{
  if(clip.creatorId===viewerId)return true;
  if(blockedIds.has(clip.creatorId)||mutedIds.has(clip.creatorId))return false;
  if(clip.visibility==="PUBLIC")return true;
  if(clip.visibility==="FOLLOWERS")return followedIds.has(clip.creatorId);
  return false;
 });
}
