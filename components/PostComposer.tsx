"use client";
import { ChangeEvent,FormEvent,useEffect,useState } from "react";
type Preview={file:File;url:string;kind:"IMAGE"|"VIDEO"};
export function PostComposer(){
 const [caption,setCaption]=useState("");const [status,setStatus]=useState("");const [items,setItems]=useState<Preview[]>([]);
 useEffect(()=>()=>items.forEach(x=>URL.revokeObjectURL(x.url)),[items]);
 function choose(e:ChangeEvent<HTMLInputElement>){const files=Array.from(e.target.files??[]).slice(0,10);items.forEach(x=>URL.revokeObjectURL(x.url));setItems(files.map(file=>({file,url:URL.createObjectURL(file),kind:file.type.startsWith("video/")?"VIDEO":"IMAGE"})));setStatus(files.length?"Media selected. Cloud upload connection is the next step.":"")}
 async function submit(e:FormEvent){e.preventDefault();if(items.length){setStatus("Media preview works. Production storage must be connected before publishing media.");return}setStatus("Posting…");const r=await fetch("/api/posts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({caption})});const d=await r.json();if(!r.ok){setStatus(d.error??"Could not post.");return}setCaption("");setStatus("Posted.");location.href="/";}
 return <form className="composer" onSubmit={submit}><textarea value={caption} onChange={e=>setCaption(e.target.value)} maxLength={2200} placeholder="What's happening OUTSiiDE?"/><label className="mediaPicker">＋ Add photos or video<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,video/webm" multiple onChange={choose}/></label>{items.length>0&&<div className="mediaPreviewGrid">{items.map((x,i)=>x.kind==="VIDEO"?<video key={i} src={x.url} controls playsInline/>:<img key={i} src={x.url} alt={"Selected media "+(i+1)}/>)}</div>}<div><span>{caption.length}/2200 {status&&" · "+status}</span><button disabled={!caption.trim()&&!items.length}>Post</button></div></form>;
}
