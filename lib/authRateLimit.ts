import {db} from "@/lib/db";
import {requestSecurityMeta,securityDigest} from "@/lib/requestSecurity";

type Options={
 action:string;
 identifier:string;
 request:Request;
 limit:number;
 windowMs:number;
 blockMs:number;
};

export async function checkAuthRateLimit(options:Options){
 const {ipHash}=requestSecurityMeta(options.request);
 const keyHash=securityDigest([options.action,options.identifier.toLowerCase(),ipHash].join("|"));
 const now=new Date();

 const result=await db.$transaction(async tx=>{
  const row=await tx.authRateLimit.findUnique({where:{keyHash}});
  if(row?.blockedUntil&&row.blockedUntil>now){
   return {allowed:false,retryAfterSeconds:Math.max(1,Math.ceil((row.blockedUntil.getTime()-now.getTime())/1000))};
  }

  const expired=!row||now.getTime()-row.windowStartedAt.getTime()>=options.windowMs;
  if(expired){
   await tx.authRateLimit.upsert({
    where:{keyHash},
    create:{keyHash,action:options.action,count:1,windowStartedAt:now},
    update:{action:options.action,count:1,windowStartedAt:now,blockedUntil:null}
   });
   return {allowed:true,retryAfterSeconds:0};
  }

  const next=row.count+1;
  if(next>options.limit){
   const blockedUntil=new Date(now.getTime()+options.blockMs);
   await tx.authRateLimit.update({where:{keyHash},data:{count:next,blockedUntil}});
   return {allowed:false,retryAfterSeconds:Math.max(1,Math.ceil(options.blockMs/1000))};
  }

  await tx.authRateLimit.update({where:{keyHash},data:{count:next}});
  return {allowed:true,retryAfterSeconds:0};
 },{isolationLevel:"Serializable"});

 return result;
}

export async function clearAuthRateLimit(action:string,identifier:string,request:Request){
 const {ipHash}=requestSecurityMeta(request);
 const keyHash=securityDigest([action,identifier.toLowerCase(),ipHash].join("|"));
 await db.authRateLimit.deleteMany({where:{keyHash}});
}
