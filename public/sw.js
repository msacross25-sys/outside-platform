self.addEventListener("install",()=>self.skipWaiting());

self.addEventListener("activate",event=>{
 event.waitUntil(self.clients.claim());
});

self.addEventListener("push",event=>{
 let data={};
 try{
  data=event.data?event.data.json():{};
 }catch{
  data={title:"OUTSiiDE",body:"You have new activity.",url:"/notifications"};
 }

 const title=data.title||"OUTSiiDE";
 const options={
  body:data.body||"You have new activity.",
  tag:data.tag||"outside-activity",
  data:{url:data.url||"/notifications"},
  renotify:false
 };

 event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const target=event.notification?.data?.url||"/notifications";

 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:"window",includeUncontrolled:true});
  for(const client of windows){
   if("focus" in client){
    if("navigate" in client)await client.navigate(target);
    return client.focus();
   }
  }
  return self.clients.openWindow(target);
 })());
});
