import Link from "next/link";
import {Shell} from "@/components/Shell";
import {BattleLeaderboards} from "@/components/BattleLeaderboards";
import {FeaturedBattleWinners} from "@/components/FeaturedBattleWinners";

export default function BattlesPage(){
 return <Shell><section className="page">
  <span className="eyebrow">OUTSiiDE BATTLES</span>
  <h1>Battle. Rank up. Get seen.</h1>
  <p className="lede">1 vs 1, team battles, tournaments, Last Minute Surge, streak rewards and seasonal competition.</p>
  <div className="heroButtons">
   <Link className="gradientButton" href="/host/room">Start a Battle Live</Link>
   <Link className="ghostButton" href="/battles/tournaments">Tournament Mode</Link>
  </div>
  <FeaturedBattleWinners/>
  <BattleLeaderboards/>
  <div className="featureCard">
   <h2>Battle Ranks</h2>
   <p>Bronze · Silver · Gold · Platinum · Diamond · Legend · Immortal</p>
   <p>Winning adds a 10% ranking-point bonus and can unlock featured placement, streak rewards and Battle Pass progress.</p>
  </div>
 </section></Shell>;
}
