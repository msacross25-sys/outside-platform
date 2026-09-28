import { Shell } from "@/components/Shell";
import { WalletPanel } from "@/components/WalletPanel";
export const dynamic="force-dynamic";
export default function WalletPage(){return <Shell><section className="page"><span className="eyebrow">Money</span><h1>Wallet</h1><p className="lede">Your OUTSiiDE coins, creator earnings and payout status in one place.</p><WalletPanel/></section></Shell>}
