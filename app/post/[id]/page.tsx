import { notFound } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { db } from "@/lib/db";
import { PostActions } from "@/components/PostActions";
import { CommentForm } from "@/components/CommentForm";
export const dynamic="force-dynamic";
export default async function PostPage({params}:{params:{id:string}}){const post=await db.post.findUnique({where:{id:params.id},include:{author:{select:{username:true,displayName:true}},comments:{orderBy:{createdAt:"asc"},include:{author:{select:{username:true,displayName:true}}}},_count:{select:{reactions:true,saves:true}}}});if(!post)notFound();return <Shell><section className="page"><article className="feedPost"><div className="postAuthor"><Link href={"/u/"+post.author.username}><b>{post.author.displayName}</b><span>@{post.author.username}</span></Link></div><p>{post.caption}</p><PostActions id={post.id} likes={post._count.reactions} saves={post._count.saves}/></article><CommentForm postId={post.id}/><div className="commentList">{post.comments.map(c=><article className="comment" key={c.id}><Link href={"/u/"+c.author.username}><b>{c.author.displayName}</b> <span>@{c.author.username}</span></Link><p>{c.body}</p></article>)}</div></section></Shell>}
