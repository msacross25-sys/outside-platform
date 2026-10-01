import Link from "next/link";
import {Shell} from "@/components/Shell";
import {BattleRewardCenter} from "@/components/BattleRewardCenter";

export default function BattleRewardsPage(){
 return <Shell><section className="page">
  <span className="eyebrow">BATTLE REWARDS</span>
  <h1>Win. Unlock. Level up.</h1>
  <p className="lede">Ranks, streaks, Battle Pass XP, Winner’s Wheel spins, Gems, Battle Tokens, cosmetics and achievement rewards.</p>
  <div className="heroButtons"><Link className="ghostButton" href="/battles">Back to Battles</Link></div>
  <BattleRewardCenter/>
 </section></Shell>;
}
