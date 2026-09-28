"use client";
import { FormEvent,useState } from "react";
export function PostComposer(){
 const [caption,setCaption]=useState("");const [status,setStatus]=useState("");
 async function submit(e:FormEvent){e.preventDefault();setStatus("Posting…");const r=await fetch("/api/posts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({caption})});const d=await r.json();if(!r.ok){setStatus(d.error??"Could not post.");return}setCaption("");setStatus("Posted.");location.href="/";}
 return <form className="composer" onSubmit={submit}><textarea value={caption} onChange={e=>setCaption(e.target.value)} maxLength={2200} placeholder="What's happening OUTSiiDE?" required/><div><span>{caption.length}/2200 {status&&" · "+status}</span><button>Post</button></div></form>;
}
