import webpush from "web-push";

const base=(process.env.PUSH_WORKER_BASE_URL||"").replace(/\/$/,"");
const secret=process.env.PUSH_WORKER_SECRET||"";
const once=process.env.PUSH_WORKER_ONCE==="true";
const testMode=process.env.WEB_PUSH_TEST_MODE==="true";
const pollMs=Math.max(1000,Number(process.env.PUSH_WORKER_POLL_MS||2000));

if(!base)throw new Error("PUSH_WORKER_BASE_URL is required.");
if(secret.length<32)throw new Error("PUSH_WORKER_SECRET must be at least 32 characters.");

if(!testMode){
 const subject=process.env.WEB_PUSH_SUBJECT;
 const publicKey=process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
 const privateKey=process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
 if(!subject||!publicKey||!privateKey)throw new Error("Web Push VAPID configuration is incomplete.");
 webpush.setVapidDetails(subject,publicKey,privateKey);
}

const headers={
 authorization:"Bearer "+secret,
 "content-type":"application/json"
};

async function api(path,options={}){
 return fetch(base+path,{
  ...options,
  headers:{...headers,...(options.headers||{})},
  redirect:"manual"
 });
}

async function complete(id){
 const response=await api("/api/internal/push-jobs/"+encodeURIComponent(id)+"/complete",{method:"POST"});
 if(!response.ok)throw new Error("Push completion failed with "+response.status+": "+await response.text());
}

async function fail(id,error){
 const statusCode=Number(error?.statusCode??0);
 const message=error instanceof Error?error.message:String(error);
 const response=await api("/api/internal/push-jobs/"+encodeURIComponent(id)+"/fail",{
  method:"POST",
  body:JSON.stringify({statusCode,error:message})
 });
 if(!response.ok)console.error("Push failure reporting returned",response.status,await response.text());
}

async function processJob(job){
 if(testMode){
  await complete(job.id);
  return;
 }

 await webpush.sendNotification(
  job.subscription,
  JSON.stringify(job.payload),
  {
   TTL:60*60,
   urgency:"normal"
  }
 );
 await complete(job.id);
}

while(true){
 let response;
 try{
  response=await api("/api/internal/push-jobs/claim",{method:"POST"});
 }catch(error){
  console.error("Push worker claim failed",error);
  if(once)process.exit(1);
  await new Promise(resolve=>setTimeout(resolve,pollMs));
  continue;
 }

 if(response.status===204){
  if(once)process.exit(0);
  await new Promise(resolve=>setTimeout(resolve,pollMs));
  continue;
 }

 if(!response.ok){
  console.error("Push worker claim returned",response.status,await response.text());
  if(once)process.exit(1);
  await new Promise(resolve=>setTimeout(resolve,pollMs));
  continue;
 }

 const {job}=await response.json();

 try{
  await processJob(job);
  console.log("Push delivered",job.id);
 }catch(error){
  console.error("Push delivery failed",job.id,error);
  await fail(job.id,error);
  if(once&&Number(error?.statusCode??0)===0)process.exit(1);
 }

 if(!once)continue;
}
