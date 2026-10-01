"use client";
import {useEffect,useState} from "react";

function vapidKey(value:string){
 const padding="=".repeat((4-value.length%4)%4);
 const base64=(value+padding).replace(/-/g,"+").replace(/_/g,"/");
 const raw=atob(base64);
 return Uint8Array.from(raw,char=>char.charCodeAt(0));
}

export function PushNotificationSettings(){
 const [supported,setSupported]=useState<boolean|null>(null);
 const [enabled,setEnabled]=useState(false);
 const [permission,setPermission]=useState<NotificationPermission|"unsupported">("unsupported");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);

 async function refresh(){
  const ok="serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
  setSupported(ok);
  if(!ok){
   setPermission("unsupported");
   return;
  }

  setPermission(Notification.permission);
  const registration=await navigator.serviceWorker.register("/sw.js",{scope:"/"});
  const subscription=await registration.pushManager.getSubscription();
  setEnabled(Boolean(subscription));

  if(subscription){
   await fetch("/api/push/subscriptions",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({subscription:subscription.toJSON()})
   }).catch(()=>{});
  }
 }

 useEffect(()=>{void refresh()},[]);

 async function enable(){
  setBusy(true);
  setMessage("");
  try{
   if(!supported)throw new Error("Push notifications are not supported on this browser.");
   const response=await fetch("/api/push/config",{cache:"no-store"});
   const data=await response.json();
   if(!response.ok||!data?.ready||!data?.publicKey)throw new Error(data?.error??"Push notifications are not configured.");

   const result=await Notification.requestPermission();
   setPermission(result);
   if(result!=="granted")throw new Error("Notification permission was not granted.");

   const registration=await navigator.serviceWorker.register("/sw.js",{scope:"/"});
   const existing=await registration.pushManager.getSubscription();
   const subscription=existing??await registration.pushManager.subscribe({
    userVisibleOnly:true,
    applicationServerKey:vapidKey(data.publicKey)
   });

   const save=await fetch("/api/push/subscriptions",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({subscription:subscription.toJSON()})
   });
   const saved=await save.json().catch(()=>null);
   if(!save.ok)throw new Error(saved?.error??"Could not save this notification device.");

   setEnabled(true);
   setMessage("Push notifications are on for this device.");
  }catch(error){
   setMessage(error instanceof Error?error.message:"Could not enable Push notifications.");
  }finally{
   setBusy(false);
  }
 }

 async function disable(){
  setBusy(true);
  setMessage("");
  try{
   const registration=await navigator.serviceWorker.getRegistration("/");
   const subscription=await registration?.pushManager.getSubscription();
   if(subscription){
    await fetch("/api/push/subscriptions",{
     method:"DELETE",
     headers:{"content-type":"application/json"},
     body:JSON.stringify({endpoint:subscription.endpoint})
    });
    await subscription.unsubscribe();
   }
   setEnabled(false);
   setMessage("Push notifications are off for this device.");
  }catch(error){
   setMessage(error instanceof Error?error.message:"Could not disable Push notifications.");
  }finally{
   setBusy(false);
  }
 }

 if(supported===null)return <section className="featureCard"><b>Push notifications</b><p>Checking this device…</p></section>;

 return <section className="featureCard">
  <span className="eyebrow">DEVICE ALERTS</span>
  <h2>Push notifications</h2>
  {!supported
   ?<p>This browser does not support Web Push.</p>
   :<>
    <p>{enabled?"On for this device.":"Off for this device."} Permission: {permission}.</p>
    <button type="button" disabled={busy} onClick={enabled?disable:enable}>
     {busy?"Working…":enabled?"Turn off Push":"Turn on Push"}
    </button>
   </>
  }
  {message&&<p>{message}</p>}
 </section>;
}
