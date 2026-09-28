import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { Shell } from "@/components/Shell";
import { FollowButton } from "@/components/FollowButton";

export default async function Profile({params}:{params:{username:string}}){
 const me=await currentUser();
 const user=await db.user.findUnique({where:{username:params.username.toLowerCase()},include:{_count:{select:{followers:true,following:true,posts:true}},posts:{orderBy:{createdAt:"desc"},take:24,include:{media:true,_count:{select:{reactions:true,comments:true}}}}}});
 if(!user)notFound();
 const following=me&&me.id!==user.id?!!(await db.follow.findUnique({where:{followerId_followingId:{followerId:me.id,followingId:user.id}}})):false;
 return <Shell><section className="page"><div className="profileHead"><div className="avatar">{user.displayName.slice(0,1).toUpperCase()}</div><div><span className="eyebrow">@{user.username}</span><h1>{user.displayName}</h1><p className="lede">{user.bio||"OUTSiiDE member"}</p><div className="stats"><b>{user._count.posts} posts</b><b>{user._count.followers} followers</b><b>{user._count.following} following</b></div>{me?.id===user.id?<a className="profileAction" href="/settings/profile">Edit profile</a>:<FollowButton username={user.username} initial={following}/>}</div></div><div className="postGrid">{user.posts.map(p=><article className="postTile" key={p.id}><b>{p.caption||"Post"}</b><span>♡ {p._count.reactions} · ◯ {p._count.comments}</span></article>)}</div></section></Shell>;
}
