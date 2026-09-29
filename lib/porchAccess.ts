import { db } from "@/lib/db";

export async function getPorchAccess(slug:string,userId?:string|null){
 const room=await db.porchRoom.findUnique({
  where:{slug},
  include:{members:{select:{userId:true,role:true}}}
 });
 if(!room)return {room:null,member:null,host:null,restriction:null,allowed:false,banned:false};
 const host=room.members.find(m=>m.role==="HOST")??null;
 const member=userId?room.members.find(m=>m.userId===userId)??null:null;
 if(!userId)return {room,member:null,host,restriction:null,allowed:room.visibility==="PUBLIC",banned:false};
 const restriction=await db.porchRoomRestriction.findUnique({
  where:{roomId_userId:{roomId:room.id,userId}},
  select:{banned:true,muted:true}
 });
 const banned=restriction?.banned===true;
 if(banned)return {room,member,host,restriction,allowed:false,banned:true};
 if(member)return {room,member,host,restriction,allowed:true,banned:false};
 if(room.visibility==="PUBLIC")return {room,member:null,host,restriction,allowed:true,banned:false};
 if(room.visibility==="FOLLOWERS"&&host){
  const follows=await db.follow.findUnique({
   where:{followerId_followingId:{followerId:userId,followingId:host.userId}},
   select:{followerId:true}
  });
  return {room,member:null,host,restriction,allowed:!!follows,banned:false};
 }
 return {room,member:null,host,restriction,allowed:false,banned:false};
}

export async function getLiveMemberAccess(slug:string,userId:string){
 const access=await getPorchAccess(slug,userId);
 if(!access.room||access.room.status!=="LIVE"||!access.member||access.banned)return null;
 return access;
}

export function canPublishPorchRole(role:string|null|undefined){
 return ["HOST","COHOST","SPEAKER"].includes(role??"");
}
