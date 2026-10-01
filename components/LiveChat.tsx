"use client";
import {FormEvent,useEffect,useRef,useState} from "react";

type Msg={
 id:string;
 body:string;
 createdAt:string;
 pinned:boolean;
 user:{username:string;displayName:string};
};

type LiveDataDetail={
 slug:string;
 topic:string;
 payload:any;
};

export function LiveChat({slug,role}:{slug:string;role:string|null}){
 const [messages,setMessages]=useState<Msg[]>([]);
 const [pinned,setPinned]=useState<Msg|null>(null);
 const [error,setError]=useState("");
 const [likes,setLikes]=useState(0);
 const [reactionOptions,setReactionOptions]=useState<string[]>(["❤️"]);
 const cursor=useRef<string|null>(null);
 const canPin=role==="HOST";

 function mergeMessages(incoming:Msg[]){
  setMessages(current=>{
   const seen=new Set(current.map(item=>item.id));
   const merged=[...current,...incoming.filter(item=>!seen.has(item.id))];
   return merged.slice(-200);
  });
 }

 async function loadChat(){
  const query=cursor.current?"?cursor="+encodeURIComponent(cursor.current):"";
  const response=await fetch(`/api/porch/${slug}/chat${query}`,{cache:"no-store"});
  if(!response.ok)return;
  const data=await response.json();
  const incoming:Msg[]=data.messages??[];
  mergeMessages(incoming);
  setPinned(data.pinned??null);
  if(data.nextCursor)cursor.current=data.nextCursor;
 }

 async function loadReactions(){
  const response=await fetch(`/api/porch/${slug}/reactions`,{cache:"no-store"});
  if(response.ok){const data=await response.json();setLikes(data.count??0);setReactionOptions(data.reactionOptions??["❤️"])}
 }

 useEffect(()=>{
  void loadChat();
  void loadReactions();

  const onData=(event:Event)=>{
   const detail=(event as CustomEvent<LiveDataDetail>).detail;
   if(!detail||detail.slug!==slug)return;

   if(detail.topic==="outside.chat"&&detail.payload?.message){
    const message=detail.payload.message as Msg;
    mergeMessages([message]);
    cursor.current=message.id;
   }

   if(detail.topic==="outside.reaction"&&Number.isFinite(detail.payload?.count)){
    setLikes(Number(detail.payload.count));
   }

   if(detail.topic==="outside.chat-control"){
    setPinned(detail.payload?.pinned??null);
   }
  };

  window.addEventListener("outside:live-data",onData);
  const recovery=window.setInterval(()=>{
   void loadChat();
   void loadReactions();
  },30000);

  return()=>{
   window.removeEventListener("outside:live-data",onData);
   clearInterval(recovery);
  };
 },[slug]);

 async function send(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const form=e.currentTarget;
  const data=new FormData(form);
  const body=String(data.get("body")??"");

  const response=await fetch(`/api/porch/${slug}/chat`,{
   method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({body})
  });
  const result=await response.json();

  if(!response.ok){
   setError(result.error??"Unable to send.");
   return;
  }

  form.reset();
  setError("");
  if(result.message){
   mergeMessages([result.message]);
   cursor.current=result.message.id;
  }
 }

 async function react(emoji:string){
  const response=await fetch(`/api/porch/${slug}/reactions`,{
   method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({emoji})
  });
  if(response.ok){
   const data=await response.json();
   if(Number.isFinite(data?.count))setLikes(Number(data.count));
  }
 }

 async function pin(messageId:string){
  const response=await fetch(`/api/porch/${slug}/pin`,{
   method:"PATCH",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({messageId})
  });
  if(response.ok)await loadChat();
 }

 return <section className="featureCard">
  <div>
   <span className="eyebrow">Live Chat</span>
   <div className="liveReactionBar">{reactionOptions.map(emoji=><button type="button" key={emoji} onClick={()=>react(emoji)}>{emoji}</button>)}<span>{likes.toLocaleString()}</span></div>
  </div>

  {pinned&&<div className="featureCard">
   <b>📌 {pinned.user.displayName}</b>
   <p>{pinned.body}</p>
  </div>}

  <div>
   {messages.map(message=><div key={message.id}>
    <b>@{message.user.username}</b> {message.body}
    {canPin&&!message.pinned&&<button onClick={()=>pin(message.id)}>Pin</button>}
   </div>)}
  </div>

  <form onSubmit={send}>
   <input
    name="body"
    maxLength={500}
    placeholder="Say something…"
    aria-label="Live chat message"
   />
   <button>Send</button>
  </form>

  {error&&<p>{error}</p>}
 </section>;
}
