import {createReadStream} from "node:fs";
import {mkdtemp,rm,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawn} from "node:child_process";

const base=(process.env.CLIP_WORKER_BASE_URL||"").replace(/\/$/,"");
const secret=process.env.CLIP_WORKER_SECRET||"";
const once=process.env.CLIP_WORKER_ONCE==="true";
const testMode=process.env.CLIP_WORKER_TEST_MODE==="true";
const pollMs=Math.max(1000,Number(process.env.CLIP_WORKER_POLL_MS||3000));

if(!base)throw new Error("CLIP_WORKER_BASE_URL is required.");
if(secret.length<32)throw new Error("CLIP_WORKER_SECRET must be at least 32 characters.");

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

function runFfmpeg(args){
 return new Promise((resolve,reject)=>{
  const child=spawn("ffmpeg",args,{stdio:["ignore","inherit","inherit"]});
  child.on("error",reject);
  child.on("exit",code=>code===0?resolve():reject(new Error("ffmpeg exited with code "+code)));
 });
}

async function processJob(job){
 if(testMode){
  const done=await api("/api/internal/clip-jobs/"+encodeURIComponent(job.id)+"/complete",{method:"POST"});
  if(!done.ok)throw new Error("Test completion failed with "+done.status);
  return;
 }

 const dir=await mkdtemp(join(tmpdir(),"outside-clip-"));
 const output=join(dir,"clip.mp4");

 try{
  const duration=Math.max(1,job.endSeconds-job.startSeconds);

  await runFfmpeg([
   "-hide_banner",
   "-loglevel","error",
   "-ss",String(job.startSeconds),
   "-i",job.sourceUrl,
   "-t",String(duration),
   "-map","0:v:0?",
   "-map","0:a:0?",
   "-c:v","libx264",
   "-preset","veryfast",
   "-crf","23",
   "-c:a","aac",
   "-b:a","128k",
   "-movflags","+faststart",
   "-y",
   output
  ]);

  const info=await stat(output);
  if(info.size<=0)throw new Error("ffmpeg produced an empty clip.");

  const upload=await fetch(job.uploadUrl,{
   method:"PUT",
   headers:{
    ...(job.uploadHeaders||{}),
    "content-length":String(info.size)
   },
   body:createReadStream(output),
   duplex:"half"
  });
  if(!upload.ok)throw new Error("Clip upload failed with "+upload.status);

  const done=await api("/api/internal/clip-jobs/"+encodeURIComponent(job.id)+"/complete",{method:"POST"});
  if(!done.ok){
   const text=await done.text();
   throw new Error("Clip completion failed with "+done.status+": "+text);
  }
 }finally{
  await rm(dir,{recursive:true,force:true});
 }
}

async function failJob(id,error){
 try{
  await api("/api/internal/clip-jobs/"+encodeURIComponent(id)+"/fail",{
   method:"POST",
   body:JSON.stringify({error:error instanceof Error?error.message:String(error)})
  });
 }catch{}
}

while(true){
 let response;
 try{
  response=await api("/api/internal/clip-jobs/claim",{method:"POST"});
 }catch(error){
  console.error("Clip worker claim failed",error);
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
  console.error("Clip worker claim returned",response.status,await response.text());
  if(once)process.exit(1);
  await new Promise(resolve=>setTimeout(resolve,pollMs));
  continue;
 }

 const payload=await response.json();
 const job=payload.job;

 try{
  console.log("Processing clip",job.id);
  await processJob(job);
  console.log("Clip ready",job.id);
 }catch(error){
  console.error("Clip processing failed",job.id,error);
  await failJob(job.id,error);
  if(once)process.exit(1);
 }

 if(once)process.exit(0);
}
