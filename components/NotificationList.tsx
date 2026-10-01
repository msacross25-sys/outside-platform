"use client";
import {useEffect,useState} from "react";
import Link from "next/link";

function copy(type:string){
 return type==="FOLLOW"?"followed you":
  type==="LIKE"?"liked your post":
  type==="COMMENT"?"commented on your post":
  type==="FOLLOW_REQUEST"?"requested to follow you":
  type==="MESSAGE"?"sent you a message":
  type==="LIVE_STARTED"?"is LIVE now":
  type==="GIFT_RECEIVED"?"sent you a gift":
  type==="FOLLOWER_MILESTONE"?"helped you reach a follower milestone":
  type==="REPLAY_READY"?"your Live replay is ready":
  type==="CREATOR_LEVEL"?"you unlocked a new Creator level":
  type==="BADGE_UNLOCKED"?"you unlocked an achievement":
  "has new activity";
}

export function NotificationList(){
 const [items,setItems]=useState<any[]|null>(null);

 useEffect(()=>{
  fetch("/api/notifications").then(async response=>{
   if(response.status===401){
    location.href="/login";
    return null;
   }
   return response.json();
  }).then(data=>data&&setItems(data.notifications));
 },[]);

 async function markRead(){
  await fetch("/api/notifications",{method:"PATCH"});
  setItems(current=>current?.map(item=>({
   ...item,
   readAt:item.readAt||new Date().toISOString()
  }))??[]);
 }

 if(!items)return <p>Loading activity…</p>;

 return <div>
  <div className="notificationTop">
   <h2>Activity</h2>
   <button onClick={markRead}>Mark all read</button>
  </div>
  {items.length===0
   ?<p>No activity yet.</p>
   :items.map(item=><Link
     className={"notification "+(!item.readAt?"unread":"")}
     key={item.id}
     href={item.targetUrl||(item.postId?"/post/"+item.postId:"/u/"+item.actor.username)}
    ><b>{item.actor.displayName}</b> {copy(item.type)}.</Link>)}
 </div>;
}
