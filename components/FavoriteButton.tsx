"use client";
import {useEffect,useState} from "react";

export function FavoriteButton({type,id,initial=false}:{type:"host"|"porch";id:string;initial?:boolean}){
 const [saved,setSaved]=useState(initial),[busy,setBusy]=useState(false);

 useEffect(()=>{
  let active=true;
  fetch("/api/favorites",{cache:"no-store"})
   .then(async response=>response.ok?response.json():null)
   .then(data=>{
    if(!active||!data)return;
    const exists=type==="host"
     ?(data.hosts??[]).some((item:any)=>item.hostId===id)
     :(data.porches??[]).some((item:any)=>item.roomId===id);
    setSaved(exists);
   })
   .catch(()=>{});
  return()=>{active=false};
 },[type,id]);

 async function toggle(){
  if(busy)return;
  setBusy(true);
  const body=type==="host"?{type,hostId:id}:{type,roomId:id};
  const response=await fetch("/api/favorites",{
   method:saved?"DELETE":"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify(body)
  });
  if(response.status===401){location.href="/login";return}
  if(response.ok)setSaved(value=>!value);
  setBusy(false);
 }

 return <button type="button" onClick={toggle} disabled={busy}>{saved?"★ Unpin":"☆ Pin "+(type==="host"?"Host":"Porch")}</button>;
}
