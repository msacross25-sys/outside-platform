import Link from "next/link";
import {Shell} from "@/components/Shell";
import {TopHostsSpotlight} from "@/components/TopHostsSpotlight";
import {db} from "@/lib/db";

export const dynamic="force-dynamic";

export default async function Live(){
 const [liveRooms,scheduledRooms]=await Promise.all([
  db.porchRoom.findMany({
   where:{status:"LIVE",visibility:"PUBLIC"},
   orderBy:{startedAt:"desc"},
   take:20,
   include:{members:{where:{role:"HOST"},take:1,include:{user:{select:{username:true,displayName:true,avatarUrl:true}}}},_count:{select:{members:true}}}
  }),
  db.porchRoom.findMany({
   where:{status:"SCHEDULED",visibility:"PUBLIC"},
   orderBy:{scheduledFor:"asc"},
   take:12,
   include:{members:{where:{role:"HOST"},take:1,include:{user:{select:{username:true,displayName:true,avatarUrl:true}}}},_count:{select:{members:true}}}
  })
 ]);

 return <Shell><section className="page liveHub"><p className="neonEyebrow">OUTSiiDE LIVE</p><h1>Watch it happen.</h1><p className="lede">Real rooms, real hosts and real participation. Join a Live or schedule your own.</p><div className="heroButtons"><Link className="gradientButton" href="/host/room">Create a Live Room</Link><Link className="ghostButton" href="/porch">Explore The Porch</Link></div><h2>Live now</h2>{liveRooms.length===0?<article className="featureCard"><h3>No public Lives are on right now.</h3><p>When a host goes live, the room will appear here automatically.</p></article>:<div className="porchGrid">{liveRooms.map(room=>{const host=room.members[0]?.user;return <Link className="porchCard" href={"/porch/"+room.slug} key={room.id}><span>● LIVE</span><h3>{room.title}</h3><p>{room.description}</p><small>{host?host.displayName:"Host"} · {room._count.members} in room</small></Link>})}</div>}<h2>Coming up</h2>{scheduledRooms.length===0?<p>No public Lives are scheduled yet.</p>:<div className="porchGrid">{scheduledRooms.map(room=>{const host=room.members[0]?.user;return <Link className="porchCard" href={"/porch/"+room.slug} key={room.id}><span>Scheduled</span><h3>{room.title}</h3><p>{room.description}</p><small>{host?host.displayName:"Host"}{room.scheduledFor?" · "+room.scheduledFor.toLocaleString():""}</small></Link>})}</div>}<TopHostsSpotlight/></section></Shell>;
}
