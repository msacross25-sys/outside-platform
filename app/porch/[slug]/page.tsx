import {notFound} from "next/navigation";
import {Shell} from "@/components/Shell";
import {PorchModeratorPanel} from "@/components/PorchModeratorPanel";
import {PorchRoomModeration} from "@/components/PorchRoomModeration";
import {PorchBanManager} from "@/components/PorchBanManager";
import {LiveRoomControls} from "@/components/LiveRoomControls";
import {PorchStageManager} from "@/components/PorchStageManager";
import {LiveRoomLifecycle} from "@/components/LiveRoomLifecycle";
import {LiveRoomMedia} from "@/components/LiveRoomMedia";
import {VerifiedViewingTracker} from "@/components/VerifiedViewingTracker";
import {LiveStats} from "@/components/LiveStats";
import {LiveChat} from "@/components/LiveChat";
import {LiveAnalytics} from "@/components/LiveAnalytics";
import {LivePresence} from "@/components/LivePresence";
import {ReplayManager} from "@/components/ReplayManager";
import {ViewerLiveScreen} from "@/components/ViewerLiveScreen";
import {LiveJoinGate} from "@/components/LiveJoinGate";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {getPorchAccess} from "@/lib/porchAccess";

export const dynamic="force-dynamic";

export default async function PorchRoom({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 const access=await getPorchAccess(slug,me?.id);
 if(!access.room||!access.allowed)notFound();

 if(!access.member){
  const room=access.room;
  return <Shell><section className="page"><span className="eyebrow">The Porch · {room.status}</span><h1>{room.title}</h1><p className="lede">{room.description}</p>{room.scheduledFor&&<p>Scheduled: {room.scheduledFor.toLocaleString()}</p>}<LiveJoinGate slug={room.slug}/></section></Shell>;
 }

 const room=await db.porchRoom.findUnique({where:{id:access.room.id},include:{members:{include:{user:{select:{id:true,username:true,displayName:true}}}},_count:{select:{members:true}}}});
 if(!room)notFound();
 const myMember=room.members.find(m=>m.userId===me?.id);
 if(!myMember)notFound();
 const host=myMember.role==="HOST";
 const hostId=room.members.find(m=>m.role==="HOST")?.userId??"";

 return <Shell><section className="page"><span className="eyebrow">The Porch · {room.status}</span><h1>{room.title}</h1><p className="lede">{room.description}</p>{room.scheduledFor&&<p>Scheduled: {room.scheduledFor.toLocaleString()}</p>}<p>{room._count.members} people in the room</p><div className="porchPeople">{room.members.map(m=><div key={m.userId}><b>{m.user.displayName}</b><span>@{m.user.username} · {m.role.toLowerCase()}</span></div>)}</div>{host&&<LiveRoomLifecycle slug={room.slug} status={room.status}/>} {host&&<LiveRoomControls slug={room.slug} screenSharing={room.screenSharing} initialSettings={{chatEnabled:room.chatEnabled,followersOnlyChat:room.followersOnlyChat,slowModeSeconds:room.slowModeSeconds,giftsEnabled:room.giftsEnabled,musicEnabled:room.musicEnabled}}/>}<ReplayManager slug={room.slug} host={host} status={room.status}/><LivePresence slug={room.slug} status={room.status}/><LiveAnalytics slug={room.slug} status={room.status} host={host}/><LiveStats slug={room.slug} status={room.status} startedAt={room.startedAt?.toISOString()??null}/>{host?<><VerifiedViewingTracker slug={room.slug} status={room.status} host={true}/><LiveRoomMedia slug={room.slug} roomType={room.roomType} status={room.status} meId={me!.id} initialMembers={room.members} myRole={myMember.role}/><PorchStageManager slug={room.slug} members={room.members} role={myMember.role} stageSize={room.stageSize}/>{room.status==="LIVE"&&<LiveChat slug={room.slug} role={myMember.role}/>}</>:<ViewerLiveScreen room={room} meId={me!.id} myRole={myMember.role} hostId={hostId}/>}<PorchModeratorPanel slug={room.slug} members={room.members} host={host}/>{host&&<PorchBanManager slug={room.slug}/>}<PorchRoomModeration slug={room.slug} members={room.members} role={myMember.role}/></section></Shell>;
}
