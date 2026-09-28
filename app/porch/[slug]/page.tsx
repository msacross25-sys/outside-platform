import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { PorchModeratorPanel } from "@/components/PorchModeratorPanel";
import { PorchRoomModeration } from "@/components/PorchRoomModeration";
import { GiftTray } from "@/components/GiftTray";
import { LiveRoomControls } from "@/components/LiveRoomControls";
import { PorchBanManager } from "@/components/PorchBanManager";
import { PorchStageManager } from "@/components/PorchStageManager";
import { LiveRoomLifecycle } from "@/components/LiveRoomLifecycle";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
export const dynamic="force-dynamic";
export default async function PorchRoom({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const me=await currentUser();const room=await db.porchRoom.findUnique({where:{slug},include:{members:{include:{user:{select:{username:true,displayName:true}}}},_count:{select:{members:true}}}});if(!room)notFound();const myMember=me?room.members.find(m=>m.userId===me.id):undefined;const host=myMember?.role==="HOST";return <Shell><section className="page"><span className="eyebrow">The Porch · {room.status}</span><h1>{room.title}</h1><p className="lede">{room.description}</p>{room.scheduledFor&&<p>Scheduled: {room.scheduledFor.toLocaleString()}</p>}<p>{room._count.members} people in the room</p><div className="porchPeople">{room.members.map(m=><div key={m.userId}><b>{m.user.displayName}</b><span>@{m.user.username} · {m.role.toLowerCase()}</span></div>)}</div>{host&&<LiveRoomLifecycle slug={room.slug} status={room.status}/>} {host&&<LiveRoomControls slug={room.slug} screenSharing={room.screenSharing}/>}<PorchStageManager slug={room.slug} members={room.members} role={myMember?.role??null} stageSize={room.stageSize}/><GiftTray slug={room.slug} canGift={!!myMember&&room.status==="LIVE"&&!host}/><PorchModeratorPanel slug={room.slug} members={room.members} host={host}/><PorchRoomModeration slug={room.slug} members={room.members} role={myMember?.role??null}/>{host&&<PorchBanManager slug={room.slug}/>}<div className="porchStage"><h2>Conversation stage</h2><p>Real-time audio/video transport will connect here. Room roles and scheduling are already backed by the database.</p></div></section></Shell>}