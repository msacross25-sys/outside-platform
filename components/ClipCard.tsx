"use client";
import {FormEvent,useEffect,useState} from "react";
import {FollowButton} from "@/components/FollowButton";
import {ProfileGiftTray} from "@/components/ProfileGiftTray";

export function ClipCard({clip,viewerId}:{clip:any;viewerId?:string}){
 const [liked,setLiked]=useState(false);
 const [likes,setLikes]=useState<number>(Number(clip._count?.likes??0));
 const [comments,setComments]=useState<any[]>([]);
 const [mediaUrl,setMediaUrl]=useState<string|null>(clip.mediaUrl??null);
 const [message,setMessage]=useState("");
 const [working,setWorking]=useState(false);
 const owner=viewerId===clip.creatorId;

 useEffect(()=>{
  fetch(`/api/clips/${clip.id}`)
   .then(r=>r.ok?r.json():null)
   .then(d=>{
    if(!d)return;
    setLiked(d.liked);
    setMediaUrl(d.clip?.mediaUrl??null);
   });

  fetch(`/api/clips/${clip.id}/comments`)
   .then(r=>r.ok?r.json():null)
   .then(d=>d&&setComments(d.comments));
 },[clip.id]);

 async function like(){
  const next=!liked;
  const response=await fetch(`/api/clips/${clip.id}`,{method:next?"POST":"DELETE"});
  if(response.ok){
   setLiked(next);
   setLikes((n:number)=>Math.max(0,n+(next?1:-1)));
  }
 }

 async function comment(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const form=e.currentTarget;
  const data=new FormData(form);
  const body=String(data.get("body")??"");
  const response=await fetch(`/api/clips/${clip.id}/comments`,{
   method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({body})
  });
  if(response.ok){
   const result=await response.json();
   setComments(x=>[...x,result.comment]);
   form.reset();
  }
 }

 async function retryProcessing(){
  if(working)return;
  setWorking(true);
  setMessage("Retrying clip processing…");
  try{
   const response=await fetch(`/api/clips/${clip.id}/process`,{method:"POST"});
   const data=await response.json();
   if(!response.ok){
    setMessage(data.error??"Clip processing could not be retried.");
    return;
   }
   if(data.ready&&data.mediaUrl){
    setMediaUrl(data.mediaUrl);
    setMessage("Clip ready.");
   }else{
    setMessage("Clip processing queued.");
   }
  }finally{
   setWorking(false);
  }
 }

 async function deleteClip(){
  if(working)return;
  if(!window.confirm("Delete this clip? This cannot be undone."))return;
  setWorking(true);
  try{
   const response=await fetch(`/api/clips/${clip.id}/manage`,{method:"DELETE"});
   if(response.ok){
    location.reload();
    return;
   }
   const data=await response.json().catch(()=>null);
   setMessage(data?.error??"Clip could not be deleted.");
  }finally{
   setWorking(false);
  }
 }

 return <article className="featureCard">
  <span className="eyebrow">OUTSiiDE Clip · from Live</span>
  <h3>{clip.title||clip.room?.title||"Live clip"}</h3>

  {mediaUrl
   ?<video controls playsInline src={mediaUrl} style={{width:"100%",maxWidth:640,borderRadius:16}}/>
   :<p>Clip media is processing.</p>}

  {owner&&!mediaUrl&&<button disabled={working} onClick={retryProcessing}>
   {working?"Working…":"Retry processing"}
  </button>}

  <p>
   From <a href={`/porch/${clip.room?.slug}`}>{clip.room?.title||"Live"}</a>
   {" · "}by <a href={`/u/${clip.creator?.username}`}>@{clip.creator?.username}</a>
  </p>

  {viewerId!==clip.creatorId&&clip.creator?.username&&<>
   <FollowButton username={clip.creator.username} initial={false}/>
   <ProfileGiftTray username={clip.creator.username}/>
  </>}

  <button onClick={like}>{liked?"♥":"♡"} {likes}</button>
  <span> · {comments.length} comments</span>

  {viewerId&&<form onSubmit={comment}>
   <input name="body" maxLength={500} placeholder="Comment on this clip" required/>
   <button>Post</button>
  </form>}

  {owner&&<button disabled={working} onClick={deleteClip}>Delete clip</button>}
  {message&&<p>{message}</p>}

  {comments.slice(-20).map(x=><p key={x.id}><b>@{x.user.username}</b> {x.body}</p>)}
 </article>;
}
