"use client";
import {useEffect,useState} from "react";
const usd=(c:number)=>"$"+(c/100).toFixed(2);

export function HQPayoutQueue(){
 const [d,setD]=useState<any>(null);

 useEffect(()=>{
  fetch("/api/hq/finance/queue")
   .then(r=>r.ok?r.json():null)
   .then(setD);
 },[]);

 if(!d)return null;

 return <section className="hqPanel">
  <div className="hqPanelHead">
   <div><span className="eyebrow">Owner Finance</span><h2>Ready to Pay</h2></div>
   <b>{d.queue.length} accounts</b>
  </div>

  {d.queue.length===0
   ?<p>No Creator payouts need attention.</p>
   :d.queue.map((x:any)=><article key={x.creator.id}>
     <div>
      <b>@{x.creator.username}</b>
      <span> · {usd(x.availableCents)} available</span>
      <small>
       {" · "}Provider {x.creator.payoutAccount?.provider??"not connected"}
       {" · "}Payouts {x.creator.payoutAccount?.payoutsEnabled?"enabled":"not enabled"}
       {" · "}Details {x.creator.payoutAccount?.detailsSubmitted?"complete":"incomplete"}
       {" · "}Identity {x.creator.payoutAccount?.identityStatus??"NOT_STARTED"}
       {" · "}Tax {x.creator.payoutAccount?.taxStatus??"NOT_STARTED"}
      </small>
     </div>
     {x.openPayout
      ?<span>{x.openPayout.status} · {usd(x.openPayout.amountCents)}</span>
      :<span>{x.eligible?"Eligible for next biweekly cycle":"Not eligible"}</span>}
    </article>)}
 </section>;
}
