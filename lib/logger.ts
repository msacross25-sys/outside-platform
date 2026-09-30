type Details=Record<string,unknown>;

function release(){
 return process.env.VERCEL_GIT_COMMIT_SHA
  ||process.env.GITHUB_SHA
  ||process.env.RENDER_GIT_COMMIT
  ||process.env.RAILWAY_GIT_COMMIT_SHA
  ||process.env.OUTSIDE_RELEASE
  ||null;
}

function safeValue(value:unknown){
 if(value instanceof Error){
  return {
   name:value.name,
   message:value.message,
   stack:process.env.NODE_ENV==="production"?undefined:value.stack
  };
 }
 return value;
}

function emit(level:"info"|"warn"|"error",event:string,details:Details={}){
 const payload={
  timestamp:new Date().toISOString(),
  level,
  service:"outside-web",
  event,
  release:release(),
  ...Object.fromEntries(Object.entries(details).map(([key,value])=>[key,safeValue(value)]))
 };
 const line=JSON.stringify(payload);
 if(level==="error")console.error(line);
 else if(level==="warn")console.warn(line);
 else console.info(line);
}

export function logInfo(event:string,details:Details={}){
 emit("info",event,details);
}

export function logWarn(event:string,details:Details={}){
 emit("warn",event,details);
}

export function logError(event:string,error:unknown,details:Details={}){
 emit("error",event,{...details,error});
}
