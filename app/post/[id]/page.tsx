import {notFound} from "next/navigation";
import Link from "next/link";
import {Shell} from "@/components/Shell";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {getPostAccess} from "@/lib/postAccess";
import {PostActions} from "@/components/PostActions";
import {CommentForm} from "@/components/CommentForm";
import {MediaPreview} from "@/components/MediaPreview";

export const dynamic="force-dynamic";

export default async function PostPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const me=await currentUser();
 if(!await getPostAccess(id,me?.id))notFound();

 const post=await db.post.findUnique({
  where:{id},
  include:{
   author:{select:{id:true,username:true,displayName:true,status:true}},
   media:{orderBy:{position:"asc"}},
   reactions:{where:{userId:me?.id??""},select:{userId:true}},
   saves:{where:{userId:me?.id??""},select:{userId:true}},
   comments:{orderBy:{createdAt:"asc"},include:{author:{select:{id:true,username:true,displayName:true,status:true}}}},
   _count:{select:{reactions:true,saves:true}}
  }
 });
 if(!post||post.author.status!=="ACTIVE")notFound();

 let excluded=new Set<string>();
 if(me){
  const [blocks,mutes]=await Promise.all([
   db.block.findMany({where:{OR:[{blockerId:me.id},{blockedId:me.id}]},select:{blockerId:true,blockedId:true}}),
   db.mute.findMany({where:{muterId:me.id},select:{mutedId:true}})
  ]);
  excluded=new Set([...blocks.flatMap(x=>[x.blockerId,x.blockedId]),...mutes.map(x=>x.mutedId)]);
  excluded.delete(me.id);
 }
 const comments=post.comments.filter(c=>c.author.status==="ACTIVE"&&!excluded.has(c.author.id));

 return <Shell><section className="page"><article className="feedPost"><div className="postAuthor"><Link href={"/u/"+post.author.username}><b>{post.author.displayName}</b><span>@{post.author.username}</span></Link></div><p>{post.caption}</p><MediaPreview media={post.media}/><PostActions id={post.id} likes={post._count.reactions} saves={post._count.saves} initialLiked={post.reactions.length>0} initialSaved={post.saves.length>0}/></article><CommentForm postId={post.id}/><div className="commentList">{comments.map(c=><article className="comment" key={c.id}><Link href={"/u/"+c.author.username}><b>{c.author.displayName}</b> <span>@{c.author.username}</span></Link><p>{c.body}</p></article>)}</div></section></Shell>;
}
