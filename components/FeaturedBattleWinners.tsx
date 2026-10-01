import Link from "next/link";
import {db} from "@/lib/db";

export async function FeaturedBattleWinners(){
 const rows=await db.battleProfile.findMany({
  where:{featuredUntil:{gt:new Date()},user:{status:"ACTIVE"}},
  orderBy:{rankingPoints:"desc"},
  take:12,
  include:{user:{select:{username:true,displayName:true,avatarUrl:true}}}
 });
 if(!rows.length)return null;
 return <section className="communityBand">
  <div>
   <p className="neonEyebrow">BATTLE WINNERS</p>
   <h2>They won. Now they get the spotlight.</h2>
   <p>Recent winners receive temporary featured placement across OUTSiiDE.</p>
  </div>
  <div className="communityCards">
   {rows.map(row=><Link key={row.userId} href={"/u/"+row.user.username}>
    <b>🏆 {row.user.displayName}</b>
    <span> · {row.rankTitle} · {row.wins} wins</span>
   </Link>)}
  </div>
 </section>;
}
