"use client";
import {FormEvent,useEffect,useState} from "react";
import {FollowButton} from "@/components/FollowButton";
import {ProfileGiftTray} from "@/components/ProfileGiftTray";

export function ClipCard({clip,viewerId}:{clip:any;viewerId?:string}){
 const [liked,setLiked]=useState(false);
 const [likes,setLikes]=useState<number>(Number(clip._count?.likes??0));
 const [comments,setComments]=useState<any[]>([]);

 useEffect(()=>{
  fetch(`/api/clips/${clip.id}`).then(r=>r.ok?r.json():null).then(d=>{if(d)setLiked(d.liked)});
  fetch(`/api/clips/${clip.id}/comments`).then(r=>r.ok?r.json():null).then(d=>d&&setComments(d.comments));
 },[clip.id]);

 async function like(){
  const next=!liked;
  const r=await fetch(`/api/clips/${clip.id}`,{method:next?"POST":"DELETE"});
  if(r.ok){
   setLiked(next);
   setLikes((n:number)=>Math.max(0,n+(next?1:-1)));
  }
 }

 async function comment(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const form=e.currentTarget;
  const f=new FormData(form);
  const body=String(f.get("body")??"");
  const r=await fetch(`/api/clips/${clip.id}/comments`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({body})});
  if(r.ok){
   const d=await r.json();
   setComments(x=>[...x,d.comment]);
   form.reset();
  }
 }

 return <article className="featureCard"><span className="eyebrow">OUTSiiDE Clip · from Live</span><h3>{clip.title||clip.room?.title||"Live clip"}</h3>{clip.mediaUrl?<video controls playsInline src={clip.mediaUrl} style={{width:"100%",maxWidth:640,borderRadius:16}}/>:<p>Clip media is processing.</p>}<p>From <a href={`/porch/${clip.room?.slug}`}>{clip.room?.title||"Live"}</a> · by <a href={`/u/${clip.creator?.username}`}>@{clip.creator?.username}</a></p>{viewerId!==clip.creatorId&&clip.creator?.username&&<><FollowButton username={clip.creator.username} initial={false}/><ProfileGiftTray username={clip.creator.username}/></>}<button onClick={like}>{liked?"♥":"♡"} {likes}</button><span> · {comments.length} comments</span>{viewerId&&<form onSubmit={comment}><input name="body" maxLength={500} placeholder="Comment on this clip" required/><button>Post</button></form>}{comments.slice(-20).map(x=><p key={x.id}><b>@{x.user.username}</b> {x.body}</p>)}</article>;
}
