import Link from "next/link";
import {Shell} from "@/components/Shell";
import {KingdomCenter} from "@/components/KingdomCenter";

export default function KingdomsPage(){
 return <Shell><section className="page">
  <span className="eyebrow">KINGDOM SYSTEM</span>
  <h1>Win battles. Claim territory.</h1>
  <p className="lede">Guild members turn battle ranking points into regional territory power. Territory holders earn daily Battle Token rewards.</p>
  <div className="heroButtons"><Link className="ghostButton" href="/battles">Back to Battles</Link></div>
  <KingdomCenter/>
 </section></Shell>;
}
