import {readdir,readFile} from "node:fs/promises";
import {join,relative} from "node:path";

const root=process.cwd();
const apiRoot=join(root,"app","api");
const failures=[];

const publicMutationAllowlist=new Set([
 "app/api/users/route.ts",
 "app/api/auth/login/route.ts",
 "app/api/auth/password-reset/request/route.ts",
 "app/api/auth/password-reset/confirm/route.ts",
 "app/api/auth/verify-email/route.ts",
 "app/api/auth/verify-email/request/route.ts"
]);

const authMarkers=[
 "currentUser(",
 "currentStaff(",
 "ownerAccess(",
 "mainOwner(",
 "currentAuth(",
 "financeStaff(",
 "authorizedClipWorker(",
 "authorizedBattleRollup("
];

const signedWebhookMarkers=[
 "verifyStripeWebhook(",
 "new WebhookReceiver("
];

async function walk(dir){
 const entries=await readdir(dir,{withFileTypes:true});
 const files=[];
 for(const entry of entries){
  const full=join(dir,entry.name);
  if(entry.isDirectory())files.push(...await walk(full));
  else if(entry.isFile())files.push(full);
 }
 return files;
}

for(const file of await walk(apiRoot)){
 if(!file.endsWith("route.ts"))continue;
 const path=relative(root,file).replaceAll("\\","/");
 const content=await readFile(file,"utf8");
 const mutating=/export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/.test(content);
 const authenticatedMutation=
  publicMutationAllowlist.has(path)||
  authMarkers.some(marker=>content.includes(marker))||
  (path.startsWith("app/api/webhooks/")&&signedWebhookMarkers.some(marker=>content.includes(marker)));
 if(mutating&&!authenticatedMutation){
  failures.push(path+" has a mutating API handler without a recognized auth/signature guard.");
 }
 if(path.startsWith("app/api/hq/")&&!/(currentStaff\(|ownerAccess\(|mainOwner\(|financeStaff\()/.test(content)){
  failures.push(path+" is an HQ route without a recognized staff/owner authorization guard.");
 }
}

const sourceFiles=(await walk(root)).filter(file=>
 !file.includes("/node_modules/")&&
 !file.includes("/.git/")&&
 !file.includes("/.next/")&&
 /\.(ts|tsx|js|mjs|json|md|yml|yaml|example)$/.test(file)
);

const secretPatterns=[
 {name:"embedded PostgreSQL credentials",pattern:/postgres(?:ql)?:\/\/[^\s"'<>]+:[^\s"'<>]+@/i},
 {name:"private key",pattern:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/},
 {name:"live Stripe secret",pattern:/\bsk_live_[A-Za-z0-9]{20,}\b/},
 {name:"Supabase service-role token label",pattern:/SUPABASE_SERVICE_ROLE\s*=\s*[^\s#]+/i}
];

for(const file of sourceFiles){
 const path=relative(root,file).replaceAll("\\","/");
 if(path==="scripts/security-static-audit.mjs")continue;
 let content=await readFile(file,"utf8").catch(()=>null);
 if(content===null)continue;
 if(path===".github/workflows/ci.yml"){
  content=content.replaceAll("postgresql://postgres:postgres@localhost:5432/outside","");
  content=content.replaceAll("postgresql://postgres:postgres@localhost:5432/outside_shadow","");
 }
 for(const check of secretPatterns){
  if(check.pattern.test(content))failures.push(path+" appears to contain "+check.name+".");
 }
}

if(failures.length){
 console.error("OUTSiiDE security static audit failed:");
 for(const failure of failures)console.error("- "+failure);
 process.exit(1);
}

console.log("OUTSiiDE security static audit passed.");
