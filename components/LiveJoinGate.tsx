"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

export function LiveJoinGate({slug}:{slug:string}){
 const router=useRouter();
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function join(){
  if(busy)return;
  setBusy(true);setMessage("");
  const r=await fetch(`/api/porch/${slug}/join`,{method:"POST"});
  const d=await r.json().catch(()=>({}));
  if(r.status===401){location.href=`/login?next=${encodeURIComponent(location.pathname)}`;return}
  if(!r.ok){setMessage(d.error??"Unable to join this Live.");setBusy(false);return}
  router.refresh();
 }
 return <section className="featureCard"><span className="eyebrow">OUTSiiDE LIVE</span><h2>Ready to step onto the Porch?</h2><p>Join the room to watch, chat, react, gift, and request the stage.</p><button onClick={join} disabled={busy}>{busy?"Joining…":"Join Live"}</button>{message&&<p>{message}</p>}</section>;
}
