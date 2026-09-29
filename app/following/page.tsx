import Link from "next/link";
import {Shell} from "@/components/Shell";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {redirect} from "next/navigation";
import {MediaPreview} from "@/components/MediaPreview";
import {ClipCard} from "@/components/ClipCard";
import {PinnedFavorites} from "@/components/PinnedFavorites";

export default async function Following(){
 const me=await currentUser();
 if(!me)redirect("/login");
 const ids=(await db.follow.findMany({where:{followerId:me.id},select:{followingId:true}})).map(x=>x.followingId);
 const [live,posts,clips]=await Promise.all([
  db.porchRoom.findMany({
   where:{status:"LIVE",visibility:{in:["PUBLIC","FOLLOWERS"]},members:{some:{role:"HOST",userId:{in:ids}}}},
   take:20,
   include:{members:{where:{role:"HOST"},include:{user:{select:{username:true,displayName:true}}}}}
  }),
  db.post.findMany({
   where:{authorId:{in:ids},visibility:{in:["PUBLIC","FOLLOWERS"]}},
   orderBy:{createdAt:"desc"},
   take:20,
   include:{author:{select:{username:true,displayName:true}},media:{orderBy:{position:"asc"}},_count:{select:{reactions:true,comments:true}}}
  }),
  db.clip.findMany({
   where:{creatorId:{in:ids},visibility:{in:["PUBLIC","FOLLOWERS"]}},
   orderBy:{createdAt:"desc"},
   take:20,
   include:{creator:{select:{username:true,displayName:true}},room:{select:{slug:true,title:true}},_count:{select:{likes:true,comments:true}}}
  })
 ]);
 return <Shell><section className="page"><span className="eyebrow">FOLLOWING</span><h1>Your people, right now.</h1><PinnedFavorites/>{live.length>0&&<div className="featureCard"><h2>Live Now</h2>{live.map(r=><Link key={r.id} href={"/porch/"+r.slug}>🔴 {r.members[0]?.user.displayName} · {r.title}</Link>)}</div>}<h2>New posts</h2><div className="postGrid">{posts.map(p=><article className="postTile" key={p.id}><b>@{p.author.username}</b>{p.media.length?<MediaPreview media={p.media}/>:<p>{p.caption}</p>}<span>♡ {p._count.reactions} · ◯ {p._count.comments}</span></article>)}</div><h2>New Clips</h2>{clips.map(c=><ClipCard key={c.id} clip={c} viewerId={me.id}/>)}</section></Shell>;
}
