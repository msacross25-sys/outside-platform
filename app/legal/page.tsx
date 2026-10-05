import Link from "next/link";
import {LEGAL_DOCUMENTS,LEGAL_EFFECTIVE_DATE} from "@/lib/policies";

export default function LegalCenter(){
 return <main className="pageStack">
  <section className="hero"><span className="eyebrow">OUTSiiDE Legal & Safety</span><h1>Policies that govern the platform.</h1><p>Current policy versions are effective {LEGAL_EFFECTIVE_DATE}. Material updates may require renewed acceptance.</p></section>
  <section className="featureCard"><h2>Account agreements</h2>
   <Link href="/legal/terms">Terms of Service</Link><br/>
   <Link href="/legal/privacy">Privacy Policy</Link><br/>
   <Link href="/rules">Community Rules</Link>
  </section>
  <section className="featureCard"><h2>Money, creators and Battles</h2>
   <Link href="/legal/refund">Refund Policy</Link><br/>
   <Link href="/legal/creator-terms">Creator Terms</Link><br/>
   <Link href="/legal/battle-rules">Battle Program Rules</Link>
  </section>
  <section className="featureCard"><h2>Safety and rights</h2>
   <Link href="/legal/dmca">Copyright / DMCA</Link><br/>
   <Link href="/legal/safety">Safety & Reporting</Link><br/>
   <Link href="/legal/contact">Contact & Support</Link>
  </section>
 </main>;
}
