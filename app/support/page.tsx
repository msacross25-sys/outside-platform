import {Shell} from "@/components/Shell";
import {SupportCenter} from "@/components/SupportCenter";

export default function SupportPage(){
 return <Shell><section className="page">
  <span className="eyebrow">SUPPORT</span>
  <h1>OUTSiiDE Support</h1>
  <p className="lede">Account, Live, Battle and platform support in one place.</p>
  <SupportCenter/>
 </section></Shell>;
}
