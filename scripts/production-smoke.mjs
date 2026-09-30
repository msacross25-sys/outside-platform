const raw=process.env.PRODUCTION_BASE_URL||process.argv[2]||"";
const allowInsecure=process.env.ALLOW_INSECURE_PRODUCTION_SMOKE==="true";

if(!raw){
 console.error("PRODUCTION_BASE_URL is required.");
 process.exit(2);
}

let base;
try{
 base=new URL(raw);
}catch{
 console.error("PRODUCTION_BASE_URL is not a valid URL.");
 process.exit(2);
}

if(base.protocol!=="https:"&&!allowInsecure){
 console.error("Production smoke checks require HTTPS.");
 process.exit(2);
}

async function get(path){
 const response=await fetch(new URL(path,base),{
  method:"GET",
  redirect:"manual",
  headers:{"user-agent":"OUTSiiDE-production-smoke/1.0"}
 });
 const text=await response.text();
 let body=null;
 try{body=text?JSON.parse(text):null}catch{body=text}
 return {response,body};
}

function fail(message,detail){
 console.error("PRODUCTION SMOKE FAILURE:",message);
 if(detail!==undefined)console.error(detail);
 process.exit(1);
}

function expect(condition,message,detail){
 if(!condition)fail(message,detail);
}

const health=await get("/api/health");
expect(health.response.status===200,"Liveness failed",{status:health.response.status,body:health.body});
expect(health.body?.ok===true&&health.body?.service==="outside-web","Unexpected liveness payload",health.body);

const ready=await get("/api/ready");
expect(ready.response.status===200,"Readiness failed",{status:ready.response.status,body:ready.body});
expect(ready.body?.ready===true&&ready.body?.service==="outside-web","Unexpected readiness payload",ready.body);

const headers=health.response.headers;
expect(headers.get("x-frame-options")==="DENY","X-Frame-Options missing or incorrect",headers.get("x-frame-options"));
expect(headers.get("x-content-type-options")==="nosniff","X-Content-Type-Options missing or incorrect",headers.get("x-content-type-options"));
expect(headers.get("referrer-policy")==="strict-origin-when-cross-origin","Referrer-Policy missing or incorrect",headers.get("referrer-policy"));
expect((headers.get("permissions-policy")??"").includes("camera=(self)"),"Permissions-Policy missing expected camera rule",headers.get("permissions-policy"));
expect(!headers.get("x-powered-by"),"Framework disclosure header should be disabled",headers.get("x-powered-by"));

if(base.protocol==="https:"){
 expect((headers.get("strict-transport-security")??"").includes("max-age=31536000"),"HSTS missing or too weak",headers.get("strict-transport-security"));
}

if(process.env.EXPECTED_RELEASE){
 expect(health.body?.release===process.env.EXPECTED_RELEASE,"Liveness release does not match expected release",{expected:process.env.EXPECTED_RELEASE,actual:health.body?.release});
 expect(ready.body?.release===process.env.EXPECTED_RELEASE,"Readiness release does not match expected release",{expected:process.env.EXPECTED_RELEASE,actual:ready.body?.release});
}

console.log(JSON.stringify({
 ok:true,
 base:base.origin,
 release:health.body?.release??null,
 checkedAt:new Date().toISOString()
}));
