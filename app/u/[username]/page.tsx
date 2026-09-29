import {notFound} from "next/navigation";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {Shell} from "@/components/Shell";
import {FollowButton} from "@/components/FollowButton";
import {ProfileActions} from "@/components/ProfileActions";
import {levelFor,verifiedHours} from "@/lib/progression";
import {contactAllowed} from "@/lib/contactPrivacy";
import {ProfileTabs} from "@/components/ProfileTabs";
import {syncAchievements} from "@/lib/syncAchievements";

export default async function Profile({params}:{params:Promise<{username:string}>}){
 const {username}=await params;
 const me=await currentUser();
 const user=await db.user.findUnique({
  where:{username:username.toLowerCase()},
  include:{
   _count:{select:{followers:true,following:true,posts:true}},
   badges:{orderBy:{unlockedAt:"desc"},take:8},
   hostApplication:true,
   viewingProgress:true,
   receivedGiftTransactions:{where:{status:"SETTLED"},select:{creatorShareCents:true}},
   porchMemberships:{where:{role:"HOST"},select:{roomId:true}},
   liveReplays:{where:{visible:true,status:"READY"},orderBy:{createdAt:"desc"},take:12,include:{room:{select:{slug:true,title:true,visibility:true}}}},
   clips:{where:{visibility:"PUBLIC"},orderBy:[{featured:"desc"},{createdAt:"desc"}],take:12,include:{creator:{select:{username:true,displayName:true}},room:{select:{slug:true,title:true}},_count:{select:{likes:true,comments:true}}}},
   posts:{orderBy:{createdAt:"desc"},take:24,include:{media:{orderBy:{position:"asc"}},_count:{select:{reactions:true,comments:true}}}}
  }
 });
 if(!user||user.status!=="ACTIVE")notFound();

 const own=me?.id===user.id;
 if(me&&!own){
  const blocked=await db.block.count({where:{OR:[{blockerId:me.id,blockedId:user.id},{blockerId:user.id,blockedId:me.id}]}});
  if(blocked)notFound();
 }

 const [following,followsMe]=me&&!own?await Promise.all([
  db.follow.findUnique({where:{followerId_followingId:{followerId:me.id,followingId:user.id}},select:{followerId:true}}),
  db.follow.findUnique({where:{followerId_followingId:{followerId:user.id,followingId:me.id}},select:{followerId:true}})
 ]):[null,null];
 const isFollowing=Boolean(following);
 const friends=Boolean(following&&followsMe);
 const requested=me&&!own&&!isFollowing
  ?!!await db.followRequest.findFirst({where:{requesterId:me.id,targetId:user.id,status:"PENDING"}})
  :false;
 const privateLocked=user.privacy==="PRIVATE"&&!own&&!isFollowing;

 const canSeeVisibility=(visibility:string)=>{
  if(own)return true;
  if(privateLocked)return false;
  if(visibility==="PUBLIC")return true;
  if(visibility==="FOLLOWERS")return isFollowing;
  if(visibility==="FRIENDS")return friends;
  return false;
 };
 const visiblePosts=user.posts.filter(p=>canSeeVisibility(p.visibility));
 const visibleReplays=user.liveReplays.filter(r=>canSeeVisibility(r.room.visibility));
 const live=privateLocked?null:await db.porchRoom.findFirst({
  where:{
   status:"LIVE",
   visibility:own?undefined:{in:isFollowing?["PUBLIC","FOLLOWERS"]:["PUBLIC"]},
   members:{some:{userId:user.id,role:"HOST"}}
  },
  select:{slug:true,title:true}
 });

 if(own)await syncAchievements(user.id);

 const hours=verifiedHours(user.viewingProgress?.verifiedSeconds??0);
 const level=levelFor(user._count.followers,hours,user.hostApplication?.status==="APPROVED");
 const totalLikes=visiblePosts.reduce((n,p)=>n+p._count.reactions,0);
 const popularPosts=[...visiblePosts].sort((a,b)=>(b._count.reactions+b._count.comments)-(a._count.reactions+a._count.comments)).slice(0,3);
 const supporterMilestones=own||!privateLocked?await db.giftTransaction.groupBy({
  by:["senderId"],
  where:{recipientId:user.id,status:"SETTLED"},
  _sum:{dollarValueCents:true},
  orderBy:{_sum:{dollarValueCents:"desc"}},
  take:3
 }):[];
 const totalGiftCents=user.receivedGiftTransactions.reduce((n,g)=>n+g.creatorShareCents,0);
 const canMessage=Boolean(me&&!own&&await contactAllowed(me.id,user.id,user.messagePrivacy));
 const visiblePostCount=own?user._count.posts:visiblePosts.length;
 const showActivity=own||!user.hideActivity;
 const tabsUser={...user,posts:visiblePosts,liveReplays:visibleReplays};

 return <Shell>
  <section className="page profilePage">
   <div className="profileHero">
    <div className={live?"profileAvatarRing liveRing":"profileAvatarRing"}><div className="avatar">{user.displayName.slice(0,1).toUpperCase()}</div></div>
    <div className="profileIdentity">
     <span className="eyebrow">@{user.username} {user.verified&&"✓"}</span>
     <h1>{user.displayName}</h1>
     <p className="lede">{user.bio||"Real people. Real moments."}</p>
     {user.hostApplication?.status==="APPROVED"&&<p>👑 Host</p>}
     {live&&<a className="profileAction" href={"/porch/"+live.slug}>🔴 LIVE NOW · {live.title}</a>}
     {own?<a className="profileAction" href="/settings/profile">Edit Profile ✎</a>:<>
      <FollowButton username={user.username} initial={isFollowing} requested={requested}/>
      {canMessage?<ProfileActions username={user.username} displayName={user.displayName}/>:null}
     </>}
    </div>
   </div>

   <div className="profileStats">
    <div><b>{visiblePostCount}</b><span>Posts</span></div>
    <div><b>{privateLocked?"—":totalLikes}</b><span>Likes</span></div>
    {!user.hideConnections||own?<>
     <div><b>{user._count.followers}</b><span>Followers</span></div>
     <div><b>{user._count.following}</b><span>Following</span></div>
    </>:<div><b>Private</b><span>Connections</span></div>}
   </div>

   <div className="featureCard">
    <span className="eyebrow">Creator</span>
    <p>{level?.name??"Building toward Creator"}{showActivity?" · "+user.porchMemberships.length+" total Lives":""}{user.hostApplication?.status==="APPROVED"?" · Host approved":""}</p>
   </div>

   {user.badges.length>0&&<div className="featureCard"><span className="eyebrow">Achievements</span><p>{user.badges.map(b=><span key={b.id}>{b.icon} {b.name} </span>)}</p></div>}

   {privateLocked
    ?<div className="featureCard"><h2>Private account</h2><p>Follow this account to see its posts, Lives and clips.</p></div>
    :<>
      <div className="featureCard"><span className="eyebrow">Profile highlights</span><p>Popular posts: {popularPosts.length} · Featured clips: {user.clips.filter(c=>c.featured).length} · Top supporter milestones: {supporterMilestones.length}</p></div>
      <ProfileTabs user={tabsUser} viewerId={me?.id} hours={hours} showActivity={showActivity} levelName={level?.name??"Not yet Creator"} totalGiftCents={totalGiftCents}/>
     </>}
  </section>
 </Shell>;
}
