import {createHmac,timingSafeEqual} from "node:crypto";
import {createServer} from "node:http";
import {mkdir,rm,stat} from "node:fs/promises";
import {createReadStream} from "node:fs";
import {spawn} from "node:child_process";
import {join} from "node:path";
import {tmpdir} from "node:os";

const secret=process.env.MEDIA_PROCESSING_SIGNING_SECRET??"";
if(secret.length<32){
 console.error("MEDIA_PROCESSING_SIGNING_SECRET must be at least 32 characters.");
 process.exit(1);
}

const port=Number(process.env.PORT??8080);
const maxConcurrency=Math.max(1,Math.min(8,Number(process.env.TRANSCODER_MAX_CONCURRENCY??2)));
const allowInsecure=process.env.ALLOW_INSECURE_TRANSCODER_URLS==="true";
const root=process.env.TRANSCODER_TMP_DIR||join(tmpdir(),"outside-transcoder");

let active=0;
const queue=[];

function hmac(body){
 return createHmac("sha256",secret).update(body).digest("hex");
}

function verify(body,header){
 if(!header?.startsWith("sha256="))return false;
 const supplied=header.slice("sha256=".length);
 const expected=hmac(body);
 if(!/^[0-9a-f]{64}$/i.test(supplied))return false;
 const a=Buffer.from(supplied,"hex");
 const b=Buffer.from(expected,"hex");
 return a.length===b.length&&timingSafeEqual(a,b);
}

function validUrl(value){
 try{
  const url=new URL(value);
  return allowInsecure
   ?["http:","https:"].includes(url.protocol)
   :url.protocol==="https:";
 }catch{
  return false;
 }
}

function validateJob(job){
 if(job?.version!==1||job?.jobType!=="CLIP")return "Unsupported job.";
 if(typeof job.clipId!=="string"||job.clipId.length<5||job.clipId.length>128)return "Invalid clip ID.";
 const start=Number(job?.source?.startSeconds);
 const end=Number(job?.source?.endSeconds);
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end-start>120)return "Invalid clip time range.";
 if(!validUrl(job?.source?.url))return "Invalid source URL.";
 if(!validUrl(job?.output?.uploadUrl))return "Invalid output URL.";
 if(!validUrl(job?.callbackUrl))return "Invalid callback URL.";
 if(job?.output?.contentType!=="video/mp4")return "Unsupported output type.";
 if(job?.output?.container!=="mp4"||job?.output?.videoCodec!=="h264"||job?.output?.audioCodec!=="aac")return "Unsupported output profile.";
 return null;
}

function run(command,args){
 return new Promise((resolve,reject)=>{
  const child=spawn(command,args,{stdio:["ignore","ignore","pipe"]});
  let stderr="";
  child.stderr.on("data",chunk=>{
   if(stderr.length<8192)stderr+=String(chunk).slice(0,8192-stderr.length);
  });
  child.on("error",reject);
  child.on("close",code=>{
   if(code===0)resolve();
   else reject(new Error("Transcoder exited with code "+code+"."));
  });
 });
}

async function transcode(job,outputPath){
 const duration=Number(job.source.endSeconds)-Number(job.source.startSeconds);
 const args=[
  "-hide_banner",
  "-loglevel","error",
  "-ss",String(job.source.startSeconds),
  "-i",job.source.url,
  "-t",String(duration),
  "-map","0:v:0?",
  "-map","0:a:0?",
  "-c:v","libx264",
  "-preset","veryfast",
  "-crf","23",
  "-pix_fmt","yuv420p",
  "-c:a","aac",
  "-b:a","128k",
  "-movflags","+faststart",
  "-y",
  outputPath
 ];
 await run("ffmpeg",args);
 const info=await stat(outputPath);
 if(info.size<=0)throw new Error("Transcoder produced an empty file.");
 return info.size;
}

async function upload(job,outputPath,size){
 const headers={
  ...(job.output.headers??{}),
  "content-length":String(size)
 };
 const response=await fetch(job.output.uploadUrl,{
  method:"PUT",
  headers,
  body:createReadStream(outputPath),
  duplex:"half"
 });
 if(!response.ok)throw new Error("Output upload failed with status "+response.status+".");
}

async function callback(job,status){
 const payload=JSON.stringify({
  clipId:job.clipId,
  status
 });
 let lastError=null;
 for(let attempt=0;attempt<4;attempt++){
  try{
   const response=await fetch(job.callbackUrl,{
    method:"POST",
    headers:{
     "content-type":"application/json",
     "x-outside-signature":"sha256="+hmac(payload)
    },
    body:payload,
    signal:AbortSignal.timeout(10000)
   });
   if(response.ok)return;
   lastError=new Error("Callback returned status "+response.status+".");
  }catch(error){
   lastError=error;
  }
  await new Promise(resolve=>setTimeout(resolve,Math.min(8000,500*2**attempt)));
 }
 throw lastError??new Error("Callback failed.");
}

async function processJob(job){
 const dir=join(root,job.clipId);
 const outputPath=join(dir,"clip.mp4");
 await mkdir(dir,{recursive:true});

 let status="FAILED";
 try{
  const size=await transcode(job,outputPath);
  await upload(job,outputPath,size);
  status="READY";
 }catch(error){
  console.error(JSON.stringify({
   timestamp:new Date().toISOString(),
   level:"error",
   service:"outside-transcoder",
   event:"clip_processing_failed",
   clipId:job.clipId,
   message:error instanceof Error?error.message:"Processing failed."
  }));
 }

 try{
  await callback(job,status);
 }catch(error){
  console.error(JSON.stringify({
   timestamp:new Date().toISOString(),
   level:"error",
   service:"outside-transcoder",
   event:"clip_callback_failed",
   clipId:job.clipId,
   status,
   message:error instanceof Error?error.message:"Callback failed."
  }));
 }finally{
  await rm(dir,{recursive:true,force:true}).catch(()=>{});
 }
}

function pump(){
 while(active<maxConcurrency&&queue.length){
  const job=queue.shift();
  active++;
  void processJob(job).finally(()=>{
   active--;
   pump();
  });
 }
}

async function readBody(request,limit=65536){
 const chunks=[];
 let size=0;
 for await(const chunk of request){
  size+=chunk.length;
  if(size>limit)throw new Error("BODY_TOO_LARGE");
  chunks.push(chunk);
 }
 return Buffer.concat(chunks).toString("utf8");
}

function json(response,status,body){
 response.writeHead(status,{
  "content-type":"application/json",
  "cache-control":"no-store"
 });
 response.end(JSON.stringify(body));
}

const server=createServer(async(request,response)=>{
 if(request.method==="GET"&&request.url==="/health"){
  return json(response,200,{
   ok:true,
   service:"outside-transcoder",
   active,
   queued:queue.length,
   capacity:maxConcurrency,
   release:process.env.OUTSIDE_RELEASE??null
  });
 }

 if(request.method!=="POST"||request.url!=="/jobs"){
  return json(response,404,{error:"Not found."});
 }

 let raw="";
 try{
  raw=await readBody(request);
 }catch(error){
  return json(response,error instanceof Error&&error.message==="BODY_TOO_LARGE"?413:400,{error:"Invalid request body."});
 }

 if(!verify(raw,request.headers["x-outside-signature"])){
  return json(response,401,{error:"Unauthorized."});
 }

 let job;
 try{
  job=JSON.parse(raw);
 }catch{
  return json(response,400,{error:"Invalid JSON."});
 }

 const invalid=validateJob(job);
 if(invalid)return json(response,400,{error:invalid});

 if(queue.length>=100){
  return json(response,503,{error:"Transcoder queue is full."});
 }

 queue.push(job);
 pump();
 return json(response,202,{queued:true,clipId:job.clipId});
});

await mkdir(root,{recursive:true});
server.listen(port,"0.0.0.0",()=>{
 console.log(JSON.stringify({
  timestamp:new Date().toISOString(),
  level:"info",
  service:"outside-transcoder",
  event:"server_started",
  port,
  capacity:maxConcurrency,
  release:process.env.OUTSIDE_RELEASE??null
 }));
});

for(const signal of ["SIGTERM","SIGINT"]){
 process.on(signal,()=>{
  server.close(()=>process.exit(0));
  setTimeout(()=>process.exit(1),10000).unref();
 });
}
