import {db} from "@/lib/db";

export async function getReplayAccess(slug:string,viewerId?:string|null){
 const room=await db.porchRoom.findUnique({
  where:{slug},
  include:{
   replay:true,
   members:{
    where:{role:"HOST"},
    select:{userId:true,user:{select:{status:true}}}
   }
  }
 });

 const replay=room?.replay??null;
 const host=room?.members[0]??null;
 if(!room||!replay||!host||host.user.status!=="ACTIVE")return null;

 const hostId=host.userId;
 const owner=viewerId===hostId;

 if(owner){
  return {room,replay,hostId,owner:true};
 }

 if(replay.status!=="READY"||!replay.visible||replay.status==="DELETED")return null;

 if(!viewerId){
  return room.visibility==="PUBLIC"?{room,replay,hostId,owner:false}:null;
 }

 const [blocked,muted,follows]=await Promise.all([
  db.block.count({
   where:{OR:[
    {blockerId:viewerId,blockedId:hostId},
    {blockerId:hostId,blockedId:viewerId}
   ]}
  }),
  db.mute.count({where:{muterId:viewerId,mutedId:hostId}}),
  db.follow.findUnique({
   where:{followerId_followingId:{followerId:viewerId,followingId:hostId}},
   select:{followerId:true}
  })
 ]);

 if(blocked||muted)return null;
 if(room.visibility==="PUBLIC")return {room,replay,hostId,owner:false};
 if(room.visibility==="FOLLOWERS"&&follows)return {room,replay,hostId,owner:false};

 return null;
}
