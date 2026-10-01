import {Shell} from "@/components/Shell";
import {ReferralCenter} from "@/components/ReferralCenter";

export default function ReferralsPage(){
 return <Shell><section className="page">
  <span className="eyebrow">OUTSiiDE REFERRALS</span>
  <h1>Invite people. Share in battle growth.</h1>
  <p className="lede">When someone you referred sends gifts during an OUTSiiDE Battle, the battle-only split reserves 5% for the valid referrer.</p>
  <ReferralCenter/>
 </section></Shell>;
}
