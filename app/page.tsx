import Link from "next/link";
import { Shell } from "@/components/Shell";
import { db } from "@/lib/db";
import { PostActions } from "@/components/PostActions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const posts=await db.post.findMany({where:{visibility:"PUBLIC"},orderBy:{createdAt:"desc"},take:25,include:{author:{select:{username:true,displayName:true}},_count:{select:{reactions:true,comments:true,saves:true}}}});
  return <Shell><section className="feed">
    <div className="feedTabs"><b>For You</b><span>Following</span><span>Circles</span><span>Local</span></div>
    {posts.length===0?<article className="videoCard"><div className="videoStage"><div className="wordmark">OUTS<span>ii</span>DE</div><h1>Come OUTSiiDE.</h1><p>The feed is ready for its first real posts.</p><Link className="create" href="/signup">Create an account</Link></div></article>:posts.map(post=><article className="feedPost" key={post.id}><div className="postAuthor"><Link href={"/u/"+post.author.username}><b>{post.author.displayName}</b><span>@{post.author.username}</span></Link></div><p>{post.caption}</p><PostActions id={post.id} likes={post._count.reactions} saves={post._count.saves}/></article>)}
    <div className="control"><b>You're in control.</b><span>Why am I seeing this? · Not interested · Show me more like this</span></div>
  </section></Shell>;
}
