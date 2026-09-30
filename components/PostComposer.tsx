"use client";
import {ChangeEvent,FormEvent,useEffect,useState} from "react";

type Preview={file:File;url:string;kind:"IMAGE"|"VIDEO"};
type Uploaded={receipt:string;cleanupToken:string};

async function discard(token:string){
 try{
  await fetch("/api/media/discard",{
   method:"DELETE",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({token})
  });
 }catch{}
}

export function PostComposer(){
 const [caption,setCaption]=useState("");
 const [status,setStatus]=useState("");
 const [items,setItems]=useState<Preview[]>([]);
 const [busy,setBusy]=useState(false);

 useEffect(()=>()=>items.forEach(item=>URL.revokeObjectURL(item.url)),[items]);

 function choose(e:ChangeEvent<HTMLInputElement>){
  const files=Array.from(e.target.files??[]).slice(0,10);
  items.forEach(item=>URL.revokeObjectURL(item.url));
  setItems(files.map(file=>({
   file,
   url:URL.createObjectURL(file),
   kind:file.type.startsWith("video/")?"VIDEO":"IMAGE"
  })));
  setStatus(files.length?files.length+" media item"+(files.length===1?"":"s")+" selected.":"");
 }

 async function upload(item:Preview,index:number,total:number):Promise<Uploaded>{
  setStatus("Uploading "+(index+1)+" of "+total+"…");

  const auth=await fetch("/api/media/upload-request",{
   method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({type:item.file.type,size:item.file.size,name:item.file.name})
  });
  const authData=await auth.json();
  if(!auth.ok)throw new Error(authData.error??"Could not prepare media upload.");

  const uploadResponse=await fetch(authData.uploadUrl,{
   method:"PUT",
   headers:authData.headers??{"content-type":item.file.type},
   body:item.file
  });

  if(!uploadResponse.ok){
   await discard(authData.uploadToken);
   throw new Error("Media upload failed.");
  }

  const complete=await fetch("/api/media/complete",{
   method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({uploadToken:authData.uploadToken})
  });
  const completeData=await complete.json();

  if(!complete.ok){
   await discard(authData.uploadToken);
   throw new Error(completeData.error??"Uploaded media could not be verified.");
  }

  return {
   receipt:completeData.media.receipt,
   cleanupToken:completeData.media.receipt
  };
 }

 async function submit(e:FormEvent){
  e.preventDefault();
  if(busy)return;

  setBusy(true);
  setStatus(items.length?"Preparing media…":"Posting…");
  const uploaded:Uploaded[]=[];

  try{
   for(let i=0;i<items.length;i++){
    uploaded.push(await upload(items[i],i,items.length));
   }

   setStatus("Publishing…");
   const response=await fetch("/api/posts",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({
     caption,
     media:uploaded.map(item=>({receipt:item.receipt}))
    })
   });
   const data=await response.json();

   if(!response.ok)throw new Error(data.error??"Could not publish post.");

   setCaption("");
   setItems([]);
   setStatus("Posted.");
   location.href="/";
  }catch(error){
   await Promise.allSettled(uploaded.map(item=>discard(item.cleanupToken)));
   setStatus(error instanceof Error?error.message:"Could not publish post.");
  }finally{
   setBusy(false);
  }
 }

 return <form className="composer" onSubmit={submit}>
  <textarea
   value={caption}
   onChange={e=>setCaption(e.target.value)}
   maxLength={2200}
   placeholder="What's happening OUTSiiDE?"
   disabled={busy}
  />
  <label className="mediaPicker">
   ＋ Add photos or video
   <input
    type="file"
    accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,video/webm"
    multiple
    onChange={choose}
    disabled={busy}
   />
  </label>
  {items.length>0&&<div className="mediaPreviewGrid">
   {items.map((item,index)=>item.kind==="VIDEO"
    ?<video key={index} src={item.url} controls playsInline/>
    :<img key={index} src={item.url} alt={"Selected media "+(index+1)}/>)}
  </div>}
  <div>
   <span>{caption.length}/2200 {status&&" · "+status}</span>
   <button disabled={busy||(!caption.trim()&&!items.length)}>{busy?"Working…":"Post"}</button>
  </div>
 </form>;
}
