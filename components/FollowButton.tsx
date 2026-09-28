"use client";
import { useState } from "react";
export function FollowButton({username,initial}:{username:string;initial:boolean}){
 const [following,setFollowing]=useState(initial);
 const [busy,setBusy]=useState(false);
 async function toggle(){setBusy(true);const r=await fetch("/api/follows/"+encodeURIComponent(username),{method:following?"DELETE":"POST"});if(r.ok)setFollowing(!following);setBusy(false);}
 return <button disabled={busy} onClick={toggle}>{busy?"...":following?"Following":"Follow"}</button>;
}
