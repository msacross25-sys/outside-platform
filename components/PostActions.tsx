"use client";
import { useState } from "react";
export function PostActions({id,likes,saves}:{id:string;likes:number;saves:number}){
 const [liked,setLiked]=useState(false),[saved,setSaved]=useState(false);
 const [lc,setLc]=useState(likes),[sc,setSc]=useState(saves);
 async function toggle(kind:"like"|"save"){const active=kind==="like"?liked:saved;const r=await fetch(`/api/posts/${id}/${kind}`,{method:active?"DELETE":"POST"});if(r.status===401){location.href="/login";return}if(!r.ok)return;if(kind==="like"){setLiked(!active);setLc(x=>x+(active?-1:1))}else{setSaved(!active);setSc(x=>x+(active?-1:1))}}
 async function share(){const url=location.origin+"/post/"+id;if(navigator.share)await navigator.share({title:"OUTSiiDE",url});else{await navigator.clipboard.writeText(url);alert("Link copied.");}}
 return <div className="actions"><button onClick={()=>toggle("like")}>{liked?"♥":"♡"} {lc}</button><a href={"/post/"+id}>◯ Comment</a><button onClick={()=>toggle("save")}>{saved?"★":"☆"} {sc}</button><button onClick={share}>↗ Share</button></div>;
}
