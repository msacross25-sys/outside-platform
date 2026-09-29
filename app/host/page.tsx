import Link from "next/link";
import {Shell} from "@/components/Shell";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {redirect} from "next/navigation";
import {CreatorWallet} from "@/components/CreatorWallet";

export default async function HostCenter(){
 const me=await currentUser();
 if(!me)redirect("/login");
 const host=await db.hostApplication.findUnique({where:{userId:me.id}});
 if(host?.status!=="APPROVED")redirect("/creator");
 const rooms=await db.porchMember.findMany({where:{userId:me.id,role:"HOST"},orderBy:{joinedAt:"desc"},take:20,include:{room:{include:{replay:true}}}});
 return <Shell><section className="page"><span className="eyebrow">HOST CENTER</span><h1>Your Host dashboard.</h1><p>Lives, replays, controls, earnings and payouts stay together here.</p><div className="hqSections"><Link href="/porch">Go Live</Link><Link href="/creator">Analytics</Link><Link href="/effects">Effects</Link><Link href="/notifications">Activity</Link></div><CreatorWallet/><div className="featureCard"><h2>Your broadcasts</h2>{rooms.map(x=><Link key={x.roomId} href={"/porch/"+x.room.slug}>{x.room.status==="LIVE"?"🔴 ":""}{x.room.title} · {x.room.status}</Link>)}</div><div className="featureCard"><h2>Host documents</h2><p>Host Agreement · Identity verification · Tax onboarding · Payout status are managed separately from public profile controls.</p><p>ID: {host.identityVerificationStatus} · Tax: {host.taxStatus} · Payouts: {host.payoutEnabled?"Enabled":"Not enabled"}</p></div></section></Shell>;
}
