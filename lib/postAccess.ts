import {db} from "@/lib/db";

export async function getPostAccess(postId:string,viewerId?:string|null){
 const post=await db.post.findUnique({
  where:{id:postId},
  select:{
   id:true,
   authorId:true,
   visibility:true,
   author:{select:{status:true,commentPrivacy:true}}
  }
 });
 if(!post||post.author.status!=="ACTIVE")return null;
 if(viewerId===post.authorId)return post;
 if(!viewerId)return post.visibility==="PUBLIC"?post:null;

 const [blocked,muted,followsAuthor,authorFollowsViewer]=await Promise.all([
  db.block.count({where:{OR:[{blockerId:viewerId,blockedId:post.authorId},{blockerId:post.authorId,blockedId:viewerId}]}}),
  db.mute.count({where:{muterId:viewerId,mutedId:post.authorId}}),
  db.follow.findUnique({where:{followerId_followingId:{followerId:viewerId,followingId:post.authorId}},select:{followerId:true}}),
  db.follow.findUnique({where:{followerId_followingId:{followerId:post.authorId,followingId:viewerId}},select:{followerId:true}})
 ]);
 if(blocked||muted)return null;
 if(post.visibility==="PUBLIC")return post;
 if(post.visibility==="FOLLOWERS"&&followsAuthor)return post;
 if(post.visibility==="FRIENDS"&&followsAuthor&&authorFollowsViewer)return post;
 return null;
}
